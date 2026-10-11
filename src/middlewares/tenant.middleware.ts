import { Request, Response, NextFunction } from 'express';
import { getTenantClient } from '../../lib/prisma';

export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
    // Pegamos o ID do Header ou do User (caso já tenha passado pelo authMiddleware)
    const tenantHeader = req.headers['x-tenant-id'];
    const tenantId = tenantHeader || req.user?.tenant_id;

    if (!tenantId) {
        return res.status(403).json({
            error: 'Tenant não identificado. Certifique-se de enviar o header x-tenant-id.'
        });
    }

    // Agora o TypeScript reconhece o 'req.db' graças ao arquivo .d.ts
    req.db = getTenantClient(Number(tenantId));

    next();
}