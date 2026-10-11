'use server'

import prisma, { getTenantClient } from '@/lib/prisma'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole } from '@/lib/auth-utils'

async function getDb() {
    const h = await headers()
    const tenantId = Number(h.get('x-tenant-id') || 0)
    if (!tenantId) throw new Error('Igreja nao identificada.')
    return getTenantClient(tenantId)
}

/** Verifica se o utilizador e admin, lider do Louvor ou delegado com pode_gerir_escalas no Louvor */
async function requireLouvorPermission() {
    const session = await requireAuth()
    const isAdmin = session.role === 'ADMIN' || session.role === 'CONGREGATION_ADMIN'

    if (!isAdmin) {
        const db = await getDb()
        const lideraLouvor = await db.departamento.findFirst({
            where: { lider_id: session.membroId, nome: { contains: 'Louvor', mode: 'insensitive' } },
        })
        const delegadoLouvor = await db.integranteDepartamento.findFirst({
            where: {
                membro_id: session.membroId,
                pode_gerir_escalas: true,
                departamento: { nome: { contains: 'Louvor', mode: 'insensitive' } },
            },
        })
        if (!lideraLouvor && !delegadoLouvor) {
            throw new Error('Apenas lideres ou delegados do Louvor podem gerir o repertorio.')
        }
    }

    return session
}

// 1. BUSCAR O REPERTÓRIO DE UM EVENTO ESPECÍFICO
export async function getRepertorioByEvento(eventoId: number) {
    try {
        await requireAuth()
        const db = await getDb()
        const repertorio = await db.repertorioEvento.findMany({
            where: { evento_id: eventoId },
            include: {
                musica: true // Traz os dados da música junto (título, link, bpm)
            },
            orderBy: {
                ordem: 'asc' // Garante que a lista vem na ordem certa do culto
            }
        });
        return { success: true, data: repertorio };
    } catch (error: any) {
        return { success: false, error: 'Erro ao buscar repertório: ' + error.message };
    }
}

// 2. BUSCAR MÚSICAS NO CATÁLOGO (Para a barra de pesquisa ao adicionar)
export async function buscarMusicasCatalogo(busca: string = '') {
    try {
        await requireAuth()
        const musicas = await prisma.musica.findMany({
            where: {
                OR: [
                    { titulo: { contains: busca, mode: 'insensitive' } },
                    { artista: { contains: busca, mode: 'insensitive' } }
                ]
            },
            orderBy: { titulo: 'asc' },
            take: 10 // Limita a 10 para não pesar a busca
        });
        return { success: true, data: musicas };
    } catch (error: any) {
        return { success: false, error: 'Erro ao buscar músicas: ' + error.message };
    }
}

// 3. ADICIONAR MÚSICA AO EVENTO (Cria a ligação e define a ordem)
export async function adicionarMusicaAoRepertorio(eventoId: number, musicaId: string, tomTocado: string) {
    try {
        await requireLouvorPermission()
        const db = await getDb()
        // 1. Descobrir o tenant_id do evento para manter a integridade multitenant
        const evento = await db.evento.findUnique({
            where: { id: eventoId },
            select: { tenant_id: true }
        });

        if (!evento) return { success: false, error: 'Evento não encontrado.' };

        // 2. Descobrir qual é a última ordem para colocar a nova no final
        const ultimaMusica = await db.repertorioEvento.findFirst({
            where: { evento_id: eventoId },
            orderBy: { ordem: 'desc' }
        });

        const proximaOrdem = ultimaMusica ? ultimaMusica.ordem + 1 : 1;

        const novoItem = await db.repertorioEvento.create({
            data: {
                evento_id: eventoId,
                musica_id: musicaId,
                tenant_id: evento.tenant_id,
                tom_tocado: tomTocado,
                ordem: proximaOrdem
            }
        });

        // Atualiza a página onde o repertório está a ser exibido
        revalidatePath('/membros/dashboard');
        revalidatePath(`/eventos/${eventoId}`);

        return { success: true, data: novoItem };
    } catch (error: any) {
        // Tratamento especial para o erro de música duplicada (Unique constraint)
        if (error.code === 'P2002') {
            return { success: false, error: 'Esta música já está no repertório deste culto.' };
        }
        return { success: false, error: 'Erro ao adicionar música: ' + error.message };
    }
}

// 4. REMOVER MÚSICA DO REPERTÓRIO
export async function removerMusicaDoRepertorio(repertorioId: string) {
    try {
        await requireLouvorPermission()
        const db = await getDb()
        await db.repertorioEvento.delete({
            where: { id: repertorioId }
        });

        revalidatePath('/membros/dashboard');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'Erro ao remover música: ' + error.message };
    }
}

// Adicione esta função no seu actions/louvor-actions.ts
export async function adicionarMusicaRapidaAoEvento(eventoId: number, titulo: string, tom: string, link: string) {
    try {
        await requireLouvorPermission()
        const db = await getDb()
        // 1. Procura se a música já existe ou cria uma nova na hora
        let musica = await prisma.musica.findFirst({
            where: { titulo: { equals: titulo, mode: 'insensitive' } }
        });

        if (!musica) {
            musica = await prisma.musica.create({
                data: { titulo, link_video: link }
            });
        } else if (link && !musica.link_video) {
            // Se a música já existia mas não tinha link, atualiza com o novo link
            musica = await prisma.musica.update({
                where: { id: musica.id },
                data: { link_video: link }
            });
        }

        // 2. Descobrir o tenant_id do evento
        const eventoReq = await db.evento.findUnique({
            where: { id: eventoId },
            select: { tenant_id: true }
        });

        if (!eventoReq) return { success: false, error: 'Evento não encontrado.' };

        // 3. Define a ordem (coloca no final da lista)
        const ultimaMusica = await db.repertorioEvento.findFirst({
            where: { evento_id: eventoId },
            orderBy: { ordem: 'desc' }
        });
        const proximaOrdem = ultimaMusica ? ultimaMusica.ordem + 1 : 1;

        // 4. Salva a música na escala do culto
        const novoItem = await db.repertorioEvento.create({
            data: {
                evento_id: eventoId,
                musica_id: musica.id,
                tenant_id: eventoReq.tenant_id,
                tom_tocado: tom,
                ordem: proximaOrdem
            }
        });

        revalidatePath('/membros/dashboard');
        return { success: true, data: novoItem };
    } catch (error: any) {
        if (error.code === 'P2002') {
            return { success: false, error: 'Esta música já está nesta escala.' };
        }
        return { success: false, error: 'Erro ao adicionar música: ' + error.message };
    }
}

// Adicione no final do arquivo actions/louvor-actions.ts
export async function atualizarOrdemRepertorio(itens: { id: string, ordem: number }[]) {
    try {
        await requireLouvorPermission()
        const db = await getDb()
        // Usa uma transação para atualizar todas as ordens de uma vez com segurança
        await db.$transaction(
            itens.map(item =>
                db.repertorioEvento.update({
                    where: { id: item.id },
                    data: { ordem: item.ordem }
                })
            )
        );
        revalidatePath('/membros/dashboard');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'Erro ao reordenar: ' + error.message };
    }
}


// 2. Busca músicas APENAS no nosso banco de dados (Offline, super rápido)
export async function buscarMusicasLocalmente(busca: string) {
    try {
        await requireAuth()
        const musicas = await prisma.musica.findMany({
            where: {
                OR: [
                    { titulo: { contains: busca, mode: 'insensitive' } },
                    { artista: { contains: busca, mode: 'insensitive' } }
                ]
            },
            take: 15, // Traz só as 15 primeiras para não pesar a tela
            orderBy: { titulo: 'asc' }
        });
        return { success: true, data: musicas };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// 3. Adiciona a música na escala usando o ID do nosso banco
export async function adicionarMusicaLocalAoEvento(eventoId: number, musicaId: string, tom: string) {
    try {
        await requireLouvorPermission()
        const db = await getDb()
        const eventoReq = await db.evento.findUnique({
            where: { id: eventoId },
            select: { tenant_id: true }
        });

        if (!eventoReq) return { success: false, error: 'Evento não encontrado.' };

        const ultimaMusica = await db.repertorioEvento.findFirst({
            where: { evento_id: eventoId },
            orderBy: { ordem: 'desc' }
        });
        const proximaOrdem = ultimaMusica ? ultimaMusica.ordem + 1 : 1;

        const novoItem = await db.repertorioEvento.create({
            data: {
                evento_id: eventoId,
                musica_id: musicaId,
                tenant_id: eventoReq.tenant_id,
                tom_tocado: tom,
                ordem: proximaOrdem
            }
        });

        revalidatePath('/membros/dashboard');
        return { success: true };
    } catch (error: any) {
        if (error.code === 'P2002') return { success: false, error: 'Esta música já está na escala.' };
        return { success: false, error: 'Erro ao adicionar música.' };
    }
}

export async function getEstatisticasEscalas(departamentoId: number) {
    try {
        await requireAuth()
        const db = await getDb()
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

        // Busca todas as escalas passadas do departamento
        const historico = await db.escala.findMany({
            where: {
                departamento_id: departamentoId,
                evento: { data: { lte: new Date() } } // Apenas eventos que já passaram ou são hoje
            },
            include: {
                membro: true,
                evento: true
            },
            orderBy: { evento: { data: 'desc' } }
        });

        // Agrupar estatísticas por membro
        const estatisticasMembros = historico.reduce((acc: any, esc) => {
            const mId = esc.membro_id;
            if (!acc[mId]) {
                acc[mId] = {
                    nome: `${esc.membro.first_name} ${esc.membro.last_name}`,
                    total: 0,
                    funcoes: new Set(),
                    ultimaVez: esc.evento.data,
                    presencas: 0
                };
            }
            acc[mId].total += 1;
            acc[mId].funcoes.add(esc.funcao);
            if (new Date(esc.evento.data) > new Date(acc[mId].ultimaVez)) {
                acc[mId].ultimaVez = esc.evento.data;
            }
            return acc;
        }, {});

        return {
            success: true,
            data: Object.values(estatisticasMembros).map((m: any) => ({ ...m, funcoes: Array.from(m.funcoes) })),
            historicoCompleto: historico.slice(0, 20) // Últimas 20 escalas para o log
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ── CRIAR MÚSICA MANUAL (com todos os campos) ─────────────────────────────────
export async function criarNovaMusica(
    titulo: string,
    artista?: string,
    bpm?: number,
    tom?: string,
    link_video?: string,
    link_letra?: string,
    link_cifra?: string,
    link_audio?: string,
) {
    try {
        await requireLouvorPermission()
        const novaMusica = await prisma.musica.create({
            data: {
                titulo,
                artista: artista || null,
                bpm: bpm || null,
                tom: tom || null,
                link_video: link_video || null,
                link_letra: link_letra || null,
                link_cifra: link_cifra || null,
                link_audio: link_audio || null,
            }
        })
        return { success: true, data: novaMusica }
    } catch (error: any) {
        return { success: false, error: 'Erro ao criar música: ' + error.message }
    }
}

// ── ADICIONAR MÚSICA MANUAL AO EVENTO (com todos os campos) ──────────────────
export async function adicionarMusicaManualAoEvento(
    eventoId: number,
    titulo: string,
    artista: string,
    tom: string,
    link_video?: string,
    link_letra?: string,
    link_cifra?: string,
    link_audio?: string,
    tomOriginal?: string,
    bpm?: number,
) {
    try {
        await requireLouvorPermission()
        const db = await getDb()
        const eventoReq = await db.evento.findUnique({
            where: { id: eventoId },
            select: { tenant_id: true }
        })
        if (!eventoReq) return { success: false, error: 'Evento não encontrado.' }

        const novaMusica = await prisma.musica.create({
            data: {
                titulo,
                artista: artista || null,
                holyrics_id: null,
                tom: tomOriginal || null,
                bpm: bpm || null,
                link_video: link_video || null,
                link_letra: link_letra || null,
                link_cifra: link_cifra || null,
                link_audio: link_audio || null,
            }
        })

        const ultimaMusica = await db.repertorioEvento.findFirst({
            where: { evento_id: eventoId },
            orderBy: { ordem: 'desc' }
        })
        const proximaOrdem = ultimaMusica ? ultimaMusica.ordem + 1 : 1

        await db.repertorioEvento.create({
            data: {
                tenant_id: eventoReq.tenant_id,
                evento_id: eventoId,
                musica_id: novaMusica.id,
                tom_tocado: tom,
                ordem: proximaOrdem
            }
        })

        revalidatePath('/membros/dashboard')
        return { success: true, data: novaMusica }
    } catch (error: any) {
        return { success: false, error: 'Erro ao criar música manual: ' + error.message }
    }
}

// ── ACTUALIZAR LINKS DE UMA MÚSICA EXISTENTE ──────────────────────────────────
export async function atualizarLinksMusica(musicaId: string, dados: {
        link_video?: string | null
        link_letra?: string | null
        link_cifra?: string | null
        link_audio?: string | null
        tom?: string | null
        bpm?: number | null
        artista?: string | null
    }
) {
    try {
        await requireLouvorPermission()
        const atualizada = await prisma.musica.update({
            where: { id: musicaId },
            data: {
                link_video: dados.link_video ?? undefined,
                link_letra: dados.link_letra ?? undefined,
                link_cifra: dados.link_cifra ?? undefined,
                link_audio: dados.link_audio ?? undefined,
                tom: dados.tom ?? undefined,
                bpm: dados.bpm ?? undefined,
                artista: dados.artista ?? undefined,
            }
        })
        revalidatePath('/membros/dashboard')
        return { success: true, data: atualizada }
    } catch (error: any) {
        return { success: false, error: 'Erro ao actualizar links: ' + error.message }
    }
}

// ── SINCRONIZAR ACERVO (actualizado — preserva links existentes) ──────────────
export async function sincronizarAcervoLocal(musicasHolyrics: any[]) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        let inseridas = 0
        let atualizadas = 0

        for (const m of musicasHolyrics) {
            const existe = await prisma.musica.findUnique({ where: { holyrics_id: m.id } })

            if (existe) {
                // Actualiza titulo e artista MAS preserva os links que o admin preencheu
                await prisma.musica.update({
                    where: { id: existe.id },
                    data: {
                        titulo: m.title,
                        artista: m.artist || null,
                        // NÃO sobrescreve link_letra, link_cifra, link_audio, link_video, tom, bpm
                    }
                })
                atualizadas++
            } else {
                await prisma.musica.create({
                    data: {
                        holyrics_id: m.id,
                        titulo: m.title,
                        artista: m.artist || null,
                    }
                })
                inseridas++
            }
        }

        return { success: true, inseridas, atualizadas }
    } catch (error: any) {
        return { success: false, error: 'Erro ao sincronizar acervo: ' + error.message }
    }
}

// ── BUSCAR MÚSICA POR ID (para o modal de edição de links) ───────────────────
export async function buscarMusicaPorId(musicaId: string) {
    try {
        await requireAuth()
        const musica = await prisma.musica.findUnique({ where: { id: musicaId } })
        return { success: true, data: musica }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// ── GUARDAR CIFRA INTERNA ────────────────────────────────────────────────────
export async function salvarCifraInternaAction(musicaId: string, cifra: string) {
    try {
        await requireAuth()
        // Guardar a cifra como recebida (o editor já converte no client)
        await prisma.musica.update({
            where: { id: musicaId },
            data: { cifra_interna: cifra?.trim() || null }
        })
        revalidatePath('/louvor')
        revalidatePath('/membros/dashboard')
        return { ok: true }
    } catch (error: any) {
        return { ok: false, error: 'Erro ao guardar cifra.' }
    }
}

// ── RELATÓRIO DE LOUVOR ──

export async function buscarRelatorioLouvorAction(mes: number, ano: number) {
    try {
        await requireAuth()
        const db = await getDb()
        const h = await headers()
        const tenantId = Number(h.get('x-tenant-id') || 0)

        const inicioMes = new Date(ano, mes - 1, 1)
        const fimMes = new Date(ano, mes, 0, 23, 59, 59)

        // Buscar repertórios do mês com evento + música + escalas do depto louvor
        const repertorios = await db.repertorioEvento.findMany({
            where: {
                tenant_id: tenantId,
                evento: {
                    data: { gte: inicioMes, lte: fimMes }
                }
            },
            include: {
                musica: { select: { id: true, titulo: true, artista: true, tom: true } },
                evento: {
                    select: {
                        id: true, nome: true, data: true,
                        escalas: {
                            where: {
                                departamento: {
                                    nome: { contains: 'louvor', mode: 'insensitive' }
                                }
                            },
                            select: {
                                funcao: true,
                                confirmado: true,
                                membro: { select: { id: true, first_name: true, last_name: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { evento: { data: 'asc' } }
        })

        // Agrupar por evento
        const eventosMap = new Map<number, {
            id: number
            nome: string
            data: string
            musicas: { titulo: string; artista: string | null; tomOriginal: string | null; tomTocado: string }[]
            equipa: { nome: string; funcao: string }[]
        }>()

        repertorios.forEach(rep => {
            const ev = rep.evento
            if (!eventosMap.has(ev.id)) {
                eventosMap.set(ev.id, {
                    id: ev.id,
                    nome: ev.nome,
                    data: ev.data.toISOString(),
                    musicas: [],
                    equipa: ev.escalas
                        .filter(e => e.confirmado)
                        .map(e => ({
                            nome: `${e.membro.first_name} ${e.membro.last_name}`,
                            funcao: e.funcao
                        }))
                })
            }
            eventosMap.get(ev.id)!.musicas.push({
                titulo: rep.musica.titulo,
                artista: rep.musica.artista,
                tomOriginal: rep.musica.tom,
                tomTocado: rep.tom_tocado
            })
        })

        return { ok: true, eventos: Array.from(eventosMap.values()) }
    } catch (error: any) {
        return { ok: false, eventos: [], error: error.message }
    }
}