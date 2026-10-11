import { getTenantClient } from '../lib/prisma';

// Recuperamos o tipo de retorno da sua função de extensão
type TenantClient = ReturnType<typeof getTenantClient>;

declare global {
    namespace Express {
        interface Request {
            // Adicionamos a propriedade db e garantimos que o user possa existir
            db: TenantClient;
            user?: {
                id: number;
                tenant_id: number;
                role: string;
            };
        }
    }
}