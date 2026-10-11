import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Definimos o que esperamos encontrar dentro do Payload do Token
interface TokenPayload {
    id: number;
    tenant_id: number;
    role: string;
    iat: number;
    exp: number;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    // 1. Pega o token do cabeçalho da requisição
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Token não fornecido. Acesso negado.' });
    }

    // 2. O formato padrão é "Bearer <token>", então separamos pelo espaço
    const [, token] = authHeader.split(' ');

    try {
        // 3. Valida o token com a sua chave secreta (definida no .env)
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error("JWT_SECRET não está definido nas variáveis de ambiente.");
        }

        const decoded = jwt.verify(token, secret) as TokenPayload;

        // 4. Injeta as informações decodificadas no objeto `req.user`
        // Como já configuramos o `express.d.ts`, o TypeScript não vai reclamar aqui!
        req.user = {
            id: decoded.id,
            tenant_id: decoded.tenant_id,
            role: decoded.role,
        };

        // 5. Manda a requisição seguir para o próximo passo (o tenantMiddleware)
        return next();

    } catch (error) {
        return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
}