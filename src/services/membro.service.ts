// O tipo do db aqui seria o retorno da função getTenantClient
export class MembroService {
    private db;

    constructor(tenantPrisma: any) {
        this.db = tenantPrisma;
    }

    async listarTodosMembros() {
        // Não precisa de "where: { tenant_id }", a Extension já faz isso!
        return await this.db.membro.findMany({
            where: { is_active: true },
            include: { familia: true }
        });
    }

    async criarMembro(dadosMembro: any, tenantId: number) {
        return await this.db.membro.create({
            data: {
                ...dadosMembro,
                tenant_id: tenantId // Na criação, o tenant_id ainda é obrigatório
            }
        });
    }
}