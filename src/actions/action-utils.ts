import { z } from 'zod';

export type ZodIssueResult = {
    field: string;
    message: string;
};

export function getFirstZodIssue(error: z.ZodError): ZodIssueResult {
    const issue = error.issues[0];
    if (!issue) {
        return {field: 'root', message: 'Données invalides.'};
    }

    return {
        field: issue.path[0] ? String(issue.path[0]) : 'root',
        message: issue.message,
    };
}
