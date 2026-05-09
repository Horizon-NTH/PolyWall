import 'dotenv/config';

import { promises as fs } from 'fs';
import path from 'path';

import pino from 'pino';
import { faker } from '@faker-js/faker';
import argon2 from 'argon2';
import mime from 'mime-types';
import sanitizeFilename from 'sanitize-filename';
import {
    CreateBucketCommand,
    HeadBucketCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';

import {
    DayOfWeek,
    MediaFileStatus,
    Prisma,
    ScheduleType,
    ScreenStatus,
    UserRole,
    ZoneType,
} from '@/generated/prisma/client';
import { createDisplayTemplateKey } from '@/lib/display-templates/template-key';
import { processMediaFile } from '@/lib/media/process-media-file';
import { ADMIN_CREDENTIALS } from '@/test/fixtures/auth-test-credentials';
import { prisma } from '@/lib/prisma';
import { SUPPORTED_WIDGET_TYPE_DEFINITIONS } from '@/lib/widgets/widget-catalog';

const logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    transport:
        process.env.PINO_PRETTY === 'false'
            ? undefined
            : {
                target: 'pino-pretty',
                options: {colorize: true, translateTime: 'SYS:standard'},
            },
});

faker.seed(42);

const DEV_PASSWORD = process.env.DEV_PASSWORD ?? ADMIN_CREDENTIALS.password;
const SEED_MEDIA_DIR = path.join(process.cwd(), 'public', 'seed', 'media');
const STORAGE_DRIVER = (process.env.STORAGE_DRIVER ?? 's3').toLowerCase();
const S3_ENDPOINT = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
const S3_REGION = process.env.S3_REGION ?? 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET ?? 'polywall-dev';
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID ?? 'polywall';
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY ?? 'polywallsecret';
const S3_FORCE_PATH_STYLE =
    (process.env.S3_FORCE_PATH_STYLE ?? 'true').toLowerCase() === 'true';

type SeedMode = 'core' | 'dev' | 'prod';

function getSeedMode(): SeedMode {
    const raw =
        (process.env.SEED_MODE ??
            (process.env.NODE_ENV === 'production' ? 'prod' : 'dev')) as string;

    const mode = raw.toLowerCase();
    if (mode === 'core' || mode === 'dev' || mode === 'prod') return mode;
    throw new Error(`Invalid SEED_MODE="${raw}". Use core|dev|prod.`);
}

function dateOnlyUTC(y: number, m: number, d: number) {
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

function timeOfDayUTC(h: number, min: number, sec = 0, ms = 0) {
    return new Date(Date.UTC(1970, 0, 1, h, min, sec, ms));
}

function getMime(fileName: string) {
    return (mime.lookup(fileName) as string) || 'application/octet-stream';
}

function guessDurationSeconds(fileName: string) {
    const ext = path.extname(fileName).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext))
        return faker.number.int({min: 6, max: 15});
    if (['.mp4', '.mov', '.webm'].includes(ext))
        return faker.number.int({min: 20, max: 120});
    if (ext === '.pdf') return faker.number.int({min: 10, max: 30});
    return faker.number.int({min: 8, max: 20});
}

async function ensureTemplateWithZones(params: {
    organizationId: string | null;
    name: string;
    description: string;
    resolutionX: number;
    resolutionY: number;
    zones: Array<{
        name: string;
        zoneType: ZoneType;
        orderIndex: number;
        positionX: number;
        positionY: number;
        width: number;
        height: number;
        widgetInstance?: {
            widgetTypeId: string;
            refreshPeriodSeconds: number;
            configurationJson: Prisma.InputJsonValue;
        };
    }>;
}) {
    const templateKey = createDisplayTemplateKey(params.organizationId, params.name);
    const template =
        (await prisma.displayTemplate.findUnique({
            where: {templateKey},
        })) ??
        (await prisma.displayTemplate.findFirst({
            where: {
                organizationId: params.organizationId,
                name: params.name,
            },
        })) ??
        (await prisma.displayTemplate.create({
            data: {
                name: params.name,
                description: params.description,
                templateKey,
                resolutionX: params.resolutionX,
                resolutionY: params.resolutionY,
                organizationId: params.organizationId,
            },
        }));

    if (template.templateKey !== templateKey) {
        await prisma.displayTemplate.update({
            where: {id: template.id},
            data: {templateKey},
        });
    }

    const zones: { id: string; name: string; zoneType: ZoneType; orderIndex: number }[] = [];
    for (const zone of params.zones) {
        const existing = await prisma.displayZone.findUnique({
            where: {
                templateId_orderIndex: {
                    templateId: template.id,
                    orderIndex: zone.orderIndex,
                },
            },
        });

        if (existing) {
            zones.push(existing);
            continue;
        }

        const created = await prisma.displayZone.create({
            data: {
                ...zone,
                widgetInstance: zone.widgetInstance
                    ? {
                        create: {
                            widgetTypeId: zone.widgetInstance.widgetTypeId,
                            active: true,
                            refreshPeriodSeconds: zone.widgetInstance.refreshPeriodSeconds,
                            configurationJson: zone.widgetInstance.configurationJson,
                        },
                    }
                    : undefined,
                templateId: template.id,
            },
        });
        zones.push(created);
    }

    return {template, zones};
}

let seedS3Client: S3Client | null = null;
let seedBucketReady = false;

function isS3StorageEnabledForSeed() {
    return STORAGE_DRIVER === 's3';
}

function getSeedS3Client() {
    if (seedS3Client) return seedS3Client;
    seedS3Client = new S3Client({
        region: S3_REGION,
        endpoint: S3_ENDPOINT,
        forcePathStyle: S3_FORCE_PATH_STYLE,
        credentials: {
            accessKeyId: S3_ACCESS_KEY_ID,
            secretAccessKey: S3_SECRET_ACCESS_KEY,
        },
    });
    return seedS3Client;
}

async function ensureSeedBucketReady() {
    if (!isS3StorageEnabledForSeed()) return;
    if (seedBucketReady) return;

    const client = getSeedS3Client();

    try {
        await client.send(
            new HeadBucketCommand({
                Bucket: S3_BUCKET,
            }),
        );
        seedBucketReady = true;
        return;
    } catch {
        logger.warn({bucket: S3_BUCKET}, 'Seed bucket not found, creating it...');
    }

    await client.send(
        new CreateBucketCommand({
            Bucket: S3_BUCKET,
        }),
    );
    seedBucketReady = true;
}

async function uploadSeedFileToS3(params: {
    absolutePath: string;
    objectKey: string;
    contentType: string;
}) {
    if (!isS3StorageEnabledForSeed()) return;

    await ensureSeedBucketReady();
    const client = getSeedS3Client();
    const body = await fs.readFile(params.absolutePath);

    await client.send(
        new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: params.objectKey,
            Body: body,
            ContentType: params.contentType,
        }),
    );
}

/**
 * CORE seed (always)
 * - Stable / reference data
 * - Idempotent (create if missing)
 */
async function seedCore() {
    logger.info('Seeding CORE (WidgetType)...');

    const created = [];
    for (const wt of SUPPORTED_WIDGET_TYPE_DEFINITIONS) {
        const existing = await prisma.widgetType.findUnique({
            where: {technicalKey: wt.technicalKey},
        });
        if (existing) {
            created.push(existing);
            continue;
        }

        const row = await prisma.widgetType.create({data: wt});
        created.push(row);
    }

    logger.info({count: created.length}, 'CORE seed done.');
    return created;
}

/**
 * DEV seed (fixtures)
 * - Create if missing
 */
async function seedDev(widgetTypes: Awaited<ReturnType<typeof seedCore>>) {
    logger.info('Seeding DEV fixtures...');

    // Orgs
    const orgA =
        (await prisma.organization.findUnique({
            where: {name: 'PolyWall Demo Org'},
        })) ??
        (await prisma.organization.create({
            data: {name: 'PolyWall Demo Org', description: 'Organisation de démo (DEV)'},
        }));

    const orgB =
        (await prisma.organization.findUnique({
            where: {name: 'PolyWall Second Org'},
        })) ??
        (await prisma.organization.create({
            data: {name: 'PolyWall Second Org', description: 'Deuxième orga (DEV multi-tenant)'},
        }));

    // Users (hash unique)
    const passwordHash = await argon2.hash(DEV_PASSWORD);

    const platformAdmin =
        (await prisma.user.findUnique({
            where: {email: 'superadmin@polywall.local'},
        })) ??
        (await prisma.user.create({
            data: {
                email: 'superadmin@polywall.local',
                fullName: 'Platform Super Admin',
                description: 'Compte plateforme (DEV)',
                role: UserRole.PLATFORM_SUPER_ADMIN,
                passwordHash,
            },
        }));

    const orgAAdmin =
        (await prisma.user.findUnique({
            where: {email: ADMIN_CREDENTIALS.email},
        })) ??
        (await prisma.user.create({
            data: {
                email: ADMIN_CREDENTIALS.email,
                fullName: 'Admin Demo',
                description: 'Admin org A (DEV)',
                role: UserRole.ORGANIZATION_ADMIN,
                passwordHash,
                organizationId: orgA.id,
            },
        }));

    const orgBAdmin =
        (await prisma.user.findUnique({
            where: {email: 'admin@second.polywall.local'},
        })) ??
        (await prisma.user.create({
            data: {
                email: 'admin@second.polywall.local',
                fullName: 'Admin Second',
                description: 'Admin org B (DEV)',
                role: UserRole.ORGANIZATION_ADMIN,
                passwordHash,
                organizationId: orgB.id,
            },
        }));

    for (let i = 1; i <= 3; i++) {
        const email = `manager-${i}@demo.polywall.local`;
        const existing = await prisma.user.findUnique({where: {email}});
        if (!existing) {
            await prisma.user.create({
                data: {
                    email,
                    fullName: faker.person.fullName(),
                    description: faker.lorem.sentence(),
                    role: UserRole.CONTENT_MANAGER,
                    passwordHash,
                    organizationId: orgA.id,
                },
            });
        }
    }

    for (let i = 1; i <= 2; i++) {
        const email = `manager-${i}@second.polywall.local`;
        const existing = await prisma.user.findUnique({where: {email}});
        if (!existing) {
            await prisma.user.create({
                data: {
                    email,
                    fullName: faker.person.fullName(),
                    description: faker.lorem.sentence(),
                    role: UserRole.CONTENT_MANAGER,
                    passwordHash,
                    organizationId: orgB.id,
                },
            });
        }
    }

    logger.info(
        {
            platformAdmin: platformAdmin.email,
            orgAAdmin: orgAAdmin.email,
            orgBAdmin: orgBAdmin.email,
        },
        'Users seeded.',
    );

    // Templates + Zones + Channels + Screens
    async function seedOrgDisplay(orgId: string) {
        const clock = widgetTypes.find((w) => w.technicalKey === 'clock');
        const {template, zones} = await ensureTemplateWithZones({
            organizationId: orgId,
            name: 'Template Dashboard 16:9',
            description: 'Zone principale + zone widgets',
            resolutionX: 1920,
            resolutionY: 1080,
            zones: [
                {
                    name: 'Main',
                    zoneType: ZoneType.PLAYLIST,
                    orderIndex: 0,
                    positionX: 0,
                    positionY: 0,
                    width: 1520,
                    height: 1080,
                },
                {
                    name: 'Sidebar',
                    zoneType: ZoneType.WIDGET,
                    orderIndex: 1,
                    positionX: 1520,
                    positionY: 0,
                    width: 400,
                    height: 1080,
                    widgetInstance: clock
                        ? {
                            widgetTypeId: clock.id,
                            refreshPeriodSeconds: 30,
                            configurationJson: {timezone: 'Europe/Paris', format: 'HH:mm'},
                        }
                        : undefined,
                },
            ],
        });

        await ensureTemplateWithZones({
            organizationId: orgId,
            name: 'Template Player V1 plein écran',
            description: 'Template minimal compatible avec le player V1',
            resolutionX: 1920,
            resolutionY: 1080,
            zones: [
                {
                    name: 'Fullscreen Playlist',
                    zoneType: ZoneType.PLAYLIST,
                    orderIndex: 0,
                    positionX: 0,
                    positionY: 0,
                    width: 1920,
                    height: 1080,
                },
            ],
        });

        const channelHall =
            (await prisma.channel.findUnique({
                where: {
                    organizationId_name: {
                        organizationId: orgId,
                        name: 'Hall principal',
                    },
                },
            })) ??
            (await prisma.channel.create({
                data: {
                    name: 'Hall principal',
                    description: 'Canal du hall',
                    organizationId: orgId,
                    displayTemplateId: template.id,
                },
            }));

        const channelCafet =
            (await prisma.channel.findUnique({
                where: {
                    organizationId_name: {
                        organizationId: orgId,
                        name: 'Cafétéria',
                    },
                },
            })) ??
            (await prisma.channel.create({
                data: {
                    name: 'Cafétéria',
                    description: 'Canal de la cafet',
                    organizationId: orgId,
                    displayTemplateId: template.id,
                },
            }));

        const screens = [
            {
                name: 'Écran Hall #1',
                location: 'Bâtiment A - Entrée',
                channelId: channelHall.id,
            },
            {
                name: 'Écran Hall #2',
                location: 'Bâtiment A - Couloir',
                channelId: channelHall.id,
            },
            {
                name: 'Écran Cafet #1',
                location: 'Cafétéria - Mur',
                channelId: channelCafet.id,
            },
            {
                name: 'Écran Cafet #2',
                location: 'Cafétéria - Comptoir',
                channelId: channelCafet.id,
            },
        ];

        for (const screen of screens) {
            const existing = await prisma.screen.findUnique({
                where: {
                    organizationId_name: {
                        organizationId: orgId,
                        name: screen.name,
                    },
                },
            });

            if (existing) continue;

            await prisma.screen.create({
                data: {
                    deviceId: faker.string.uuid(),
                    name: screen.name,
                    location: screen.location,
                    organizationId: orgId,
                    channelId: screen.channelId,
                    status: ScreenStatus.ACTIVE,
                    approvedAt: new Date(),
                    interactive: false,
                },
            });
        }

        return {template, zones, channelHall, channelCafet};
    }

    const a = await seedOrgDisplay(orgA.id);
    const b = await seedOrgDisplay(orgB.id);

    async function seedWidgetsForOrg(
        zones: { id: string; name: string; zoneType: ZoneType; orderIndex: number }[],
    ) {
        const sidebar = zones.find((z) => z.zoneType === ZoneType.WIDGET);
        if (!sidebar) return;

        const clock = widgetTypes.find((w) => w.technicalKey === 'clock');
        const sidebarId = sidebar.id;

        async function ensureWidget(params: {
            widgetTypeId: string;
            refreshPeriodSeconds: number;
            configurationJson: Prisma.InputJsonValue;
        }) {
            const existing = await prisma.widgetInstance.findFirst({
                where: {
                    widgetTypeId: params.widgetTypeId,
                    displayZoneId: sidebarId,
                },
            });

            if (existing) return existing;

            return prisma.widgetInstance.create({
                data: {
                    widgetTypeId: params.widgetTypeId,
                    displayZoneId: sidebarId,
                    refreshPeriodSeconds: params.refreshPeriodSeconds,
                    active: true,
                    configurationJson: params.configurationJson,
                },
            });
        }

        if (clock) {
            await ensureWidget({
                widgetTypeId: clock.id,
                refreshPeriodSeconds: 30,
                configurationJson: {format: 'HH:mm', timezone: 'Europe/Paris'},
            });
        }
    }

    await seedWidgetsForOrg(a.zones);
    await seedWidgetsForOrg(b.zones);

    async function seedMediaLibrary(orgId: string) {
        logger.info({dir: SEED_MEDIA_DIR, organizationId: orgId}, 'Seeding media library...');

        let files: string[] = [];
        try {
            files = (await fs.readdir(SEED_MEDIA_DIR)).filter((f) => !f.startsWith('.'));
        } catch {
            logger.warn(
                {dir: SEED_MEDIA_DIR},
                'Folder not found. Create it and add files to generate real media.',
            );
        }

        const mediaItems: { id: string }[] = [];
        const orgMediaPrefix = `org/${orgId}/media/`;

        async function ensureMediaItemForFile(params: {
            organizationId: string;
            title: string;
            description: string;
            durationSeconds: number;
            storageBucket: string;
            originalFileName: string;
            mimeType: string;
            fileSizeBytes: bigint;
            initialStatus: MediaFileStatus;
        }) {
            const safeFileName = sanitizeFilename(params.originalFileName).trim() || 'seed-file.bin';
            const seedOriginalName = `seed-${safeFileName}`;

            const existing = await prisma.mediaFile.findFirst({
                where: {
                    variant: 'ORIGINAL',
                    sourceMediaFileId: null,
                    originalFileName: params.originalFileName,
                    mediaItem: {organizationId: params.organizationId},
                    objectKey: {endsWith: `/original/${seedOriginalName}`},
                },
                select: {id: true, mediaItemId: true, status: true, objectKey: true},
            });

            if (existing) {
                const desiredObjectKey =
                    `${orgMediaPrefix}${existing.mediaItemId}/original/${seedOriginalName}`;
                if (existing.status !== params.initialStatus) {
                    await prisma.mediaFile.update({
                        where: {id: existing.id},
                        data: {
                            status: params.initialStatus,
                            objectKey: desiredObjectKey,
                        },
                    });
                } else if (existing.objectKey !== desiredObjectKey) {
                    await prisma.mediaFile.update({
                        where: {id: existing.id},
                        data: {objectKey: desiredObjectKey},
                    });
                }
                return {id: existing.mediaItemId, mediaFileId: existing.id, objectKey: desiredObjectKey};
            }

            const mediaItem = await prisma.mediaItem.create({
                data: {
                    organizationId: params.organizationId,
                    title: params.title,
                    description: params.description,
                    durationSeconds: params.durationSeconds,
                    active: true,
                },
                select: {id: true},
            });
            const objectKey = `${orgMediaPrefix}${mediaItem.id}/original/${seedOriginalName}`;

            const mediaFile = await prisma.mediaFile.create({
                data: {
                    mediaItemId: mediaItem.id,
                    storageBucket: params.storageBucket,
                    objectKey,
                    originalFileName: params.originalFileName,
                    mimeType: params.mimeType,
                    fileSizeBytes: params.fileSizeBytes,
                    status: params.initialStatus,
                    variant: 'ORIGINAL',
                    variantIndex: 0,
                },
                select: {id: true},
            });

            return {id: mediaItem.id, mediaFileId: mediaFile.id, objectKey};
        }

        if (files.length === 0) {
            logger.warn('No media files found. Creating placeholders...');
            for (let i = 1; i <= 12; i++) {
                const mi = await ensureMediaItemForFile({
                    organizationId: orgId,
                    title: `Placeholder ${i}`,
                    description: faker.lorem.sentence(),
                    durationSeconds: faker.number.int({min: 6, max: 15}),
                    storageBucket: isS3StorageEnabledForSeed() ? S3_BUCKET : 'seed',
                    originalFileName: `placeholder-${i}.jpg`,
                    mimeType: 'image/jpeg',
                    fileSizeBytes: BigInt(0),
                    initialStatus: MediaFileStatus.READY,
                });
                mediaItems.push(mi);
            }
            return mediaItems;
        }

        for (const fileName of files) {
            const abs = path.join(SEED_MEDIA_DIR, fileName);
            const stat = await fs.stat(abs);
            const mimeType = getMime(fileName);

            const mi = await ensureMediaItemForFile({
                organizationId: orgId,
                title: path.parse(fileName).name.replace(/[-_]/g, ' '),
                description: faker.lorem.sentence(),
                durationSeconds: guessDurationSeconds(fileName),
                storageBucket: isS3StorageEnabledForSeed() ? S3_BUCKET : 'seed',
                originalFileName: fileName,
                mimeType,
                fileSizeBytes: BigInt(stat.size),
                initialStatus: MediaFileStatus.UPLOADED,
            });

            if (isS3StorageEnabledForSeed()) {
                await uploadSeedFileToS3({
                    absolutePath: abs,
                    objectKey: mi.objectKey,
                    contentType: mimeType,
                });
            }

            mediaItems.push(mi);

            try {
                await processMediaFile({
                    mediaFileId: mi.mediaFileId,
                    organizationId: orgId,
                });
            } catch (error) {
                logger.warn(
                    {
                        organizationId: orgId,
                        mediaFileId: mi.mediaFileId,
                        errorName: error instanceof Error ? error.name : 'UnknownError',
                        errorMessage: error instanceof Error ? error.message : String(error),
                    },
                    'Seed media processing failed.',
                );
            }
        }

        logger.info({count: mediaItems.length}, 'Media library seeded.');
        return mediaItems;
    }

    const mediaItemsOrgA = await seedMediaLibrary(orgA.id);
    const mediaItemsOrgB = await seedMediaLibrary(orgB.id);

    // Playlists + Items + Schedules
    async function seedPlaylistsAndSchedules(
        orgId: string,
        channels: { id: string; name: string }[],
        mediaItems: { id: string }[],
    ) {
        const playlists = await Promise.all([
            (await prisma.playlist.findUnique({
                where: {
                    organizationId_name: {
                        organizationId: orgId,
                        name: 'Default',
                    },
                },
            })) ??
            prisma.playlist.create({
                data: {
                    organizationId: orgId,
                    name: 'Default',
                    description: 'Playlist par défaut (DEV)',
                },
            }),
            (await prisma.playlist.findUnique({
                where: {
                    organizationId_name: {
                        organizationId: orgId,
                        name: 'Actus',
                    },
                },
            })) ??
            prisma.playlist.create({
                data: {
                    organizationId: orgId,
                    name: 'Actus',
                    description: 'Actualités (DEV)',
                },
            }),
            (await prisma.playlist.findUnique({
                where: {
                    organizationId_name: {
                        organizationId: orgId,
                        name: 'Événements',
                    },
                },
            })) ??
            prisma.playlist.create({
                data: {
                    organizationId: orgId,
                    name: 'Événements',
                    description: 'Événements (DEV)',
                },
            }),
        ]);

        for (const pl of playlists) {
            const itemCount = pl.name === 'Default' ? 10 : pl.name === 'Actus' ? 6 : 4;
            const chosen = faker.helpers.arrayElements(mediaItems, Math.min(itemCount, mediaItems.length));

            const existingCount = await prisma.playlistItem.count({
                where: {playlistId: pl.id},
            });

            if (existingCount === 0 && chosen.length > 0) {
                await prisma.playlistItem.createMany({
                    data: chosen.map((m, idx) => ({
                        playlistId: pl.id,
                        mediaItemId: m.id,
                        orderIndex: idx,
                    })),
                    skipDuplicates: true,
                });
            }
        }

        const defaultPlaylist = playlists.find((p) => p.name === 'Default')!;
        const actusPlaylist = playlists.find((p) => p.name === 'Actus')!;
        const eventPlaylist = playlists.find((p) => p.name === 'Événements')!;

        const allDays: DayOfWeek[] = [
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY,
            DayOfWeek.SATURDAY,
            DayOfWeek.SUNDAY,
        ];

        const weekDays: DayOfWeek[] = [
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY,
        ];

        const now = new Date();
        const y = now.getUTCFullYear();
        const m = now.getUTCMonth() + 1;
        const d = now.getUTCDate();

        for (const ch of channels) {
            // DEFAULT: always
            const schDefault =
                (await prisma.playlistSchedule.findFirst({
                    where: {
                        channelId: ch.id,
                        playlistId: defaultPlaylist.id,
                        type: ScheduleType.DEFAULT,
                    },
                })) ??
                (await prisma.playlistSchedule.create({
                    data: {
                        channelId: ch.id,
                        playlistId: defaultPlaylist.id,
                        type: ScheduleType.DEFAULT,
                        active: true,
                    },
                }));

            await prisma.scheduleTimeSlot.createMany({
                data: allDays.map((day) => ({
                    scheduleId: schDefault.id,
                    dayOfWeek: day,
                    startTime: timeOfDayUTC(0, 0),
                    endTime: timeOfDayUTC(23, 59, 59, 999),
                })),
                skipDuplicates: true,
            });

            // RECURRING: weekday news 08:00-18:00
            const schRecurring =
                (await prisma.playlistSchedule.findFirst({
                    where: {
                        channelId: ch.id,
                        playlistId: actusPlaylist.id,
                        type: ScheduleType.RECURRING,
                    },
                })) ??
                (await prisma.playlistSchedule.create({
                    data: {
                        channelId: ch.id,
                        playlistId: actusPlaylist.id,
                        type: ScheduleType.RECURRING,
                        active: true,
                    },
                }));

            await prisma.scheduleTimeSlot.createMany({
                data: weekDays.map((day) => ({
                    scheduleId: schRecurring.id,
                    dayOfWeek: day,
                    startTime: timeOfDayUTC(8, 0),
                    endTime: timeOfDayUTC(18, 0),
                })),
                skipDuplicates: true,
            });

            // EVENT: 7 days (09:00-17:00)
            const schEvent =
                (await prisma.playlistSchedule.findFirst({
                    where: {
                        channelId: ch.id,
                        playlistId: eventPlaylist.id,
                        type: ScheduleType.EVENT,
                    },
                })) ??
                (await prisma.playlistSchedule.create({
                    data: {
                        channelId: ch.id,
                        playlistId: eventPlaylist.id,
                        type: ScheduleType.EVENT,
                        active: true,
                        startDate: dateOnlyUTC(y, m, d),
                        endDate: dateOnlyUTC(y, m, d + 7),
                    },
                }));

            await prisma.scheduleTimeSlot.createMany({
                data: allDays.map((day) => ({
                    scheduleId: schEvent.id,
                    dayOfWeek: day,
                    startTime: timeOfDayUTC(9, 0),
                    endTime: timeOfDayUTC(17, 0),
                })),
                skipDuplicates: true,
            });
        }
    }

    await seedPlaylistsAndSchedules(orgA.id, [a.channelHall, a.channelCafet], mediaItemsOrgA);
    await seedPlaylistsAndSchedules(orgB.id, [b.channelHall, b.channelCafet], mediaItemsOrgB);

    logger.info('DEV seed complete!');
    logger.info(
        {
            password: DEV_PASSWORD,
            accounts: [
                'superadmin@polywall.local',
                ADMIN_CREDENTIALS.email,
                'admin@second.polywall.local',
                'manager-1@demo.polywall.local',
                'manager-1@second.polywall.local',
            ],
        },
        'DEV accounts',
    );
    logger.info(
        {folder: 'public/seed/media'},
        'Add files here and rerun the seed.',
    );
}

/**
 * PROD seed (bootstrap)
 * - Idempotent
 * - Never delete
 */
async function seedProd() {
    logger.info('Seeding PROD bootstrap...');

    const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

    if (!email || !password) {
        logger.warn(
            'BOOTSTRAP_ADMIN_EMAIL/PASSWORD missing. Not creating a super-admin.',
        );
        return;
    }

    const passwordHash = await argon2.hash(password);

    const existing = await prisma.user.findUnique({where: {email}});
    if (!existing) {
        await prisma.user.create({
            data: {
                email,
                fullName: 'Platform Super Admin',
                description: 'Bootstrap platform admin',
                role: UserRole.PLATFORM_SUPER_ADMIN,
                passwordHash,
            },
        });
    }

    logger.info({email}, 'PROD bootstrap admin ensured.');
}

async function main() {
    const mode = getSeedMode();

    // safety check
    if (process.env.NODE_ENV === 'production' && mode === 'dev') {
        throw new Error('Refusing to run DEV seed in production.');
    }

    const widgetTypes = await seedCore();

    if (mode === 'dev') await seedDev(widgetTypes);
    if (mode === 'prod') await seedProd();

    logger.info({mode}, 'Seed finished.');
}

main()
    .catch((e) => {
        logger.error(e, 'Seed failed');
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
