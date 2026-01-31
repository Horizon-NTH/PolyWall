export const ADMIN_CREDENTIALS = {
    email: 'admin@demo.polywall.local',
    password: 'DevPassword123!',
};

export const SUPER_ADMIN_CREDENTIALS = {
    email: 'superadmin@polywall.local',
    password: ADMIN_CREDENTIALS.password,
};

export const CONTENT_MANAGER_CREDENTIALS = {
    email: 'manager-1@demo.polywall.local',
    password: ADMIN_CREDENTIALS.password,
};
