export function getMigrationSQL(): string;
export function getVerificationSQL(): string;
export function runMigration(db: any): Promise<{
    skipped: boolean;
    success?: undefined;
    objectives_migrated?: undefined;
} | {
    success: boolean;
    objectives_migrated: any;
    skipped?: undefined;
}>;
//# sourceMappingURL=10.1a-add-reconciliation-fields.d.ts.map