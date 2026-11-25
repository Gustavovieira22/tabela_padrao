import {formatar_tamanho, pegar_primeiro_nome, 
        pegar_primeiro_e_segundo_nome, limpar_cpf, formatar_cpf,
        limpar_telefone, formatar_telefone_padrao_meta,
        adicionar_parenteses, formatar_data, concatenar_valores} from "./utils.js"
const { createApp, markRaw } = Vue;

createApp({
    data() {
        return {
            arquivo_selecionado: null,

            // Workbook lido do arquivo (não reativo) e abas disponíveis
            workbook: null,
            abas_disponiveis: [],
            aba_selecionada: "",

            dados_completos: [],
            colunas_tabela: [],

            pagina_atual: 1,
            linhas_por_pagina: 10,
            opcoes_linhas_por_pagina: [10, 25, 50, 100, 0],

            formato_download: "csv",
            formatos_download: [
                { valor: "csv", rotulo: "CSV (.csv)" },
                { valor: "xlsx", rotulo: "Excel (.xlsx)" },
                { valor: "xls", rotulo: "Excel 97-2003 (.xls)" },
                { valor: "ods", rotulo: "LibreOffice (.ods)" }
            ],

            menu_coluna_aberto: null,
            menu_posicao: { top: 0, left: 0 },

            // União de colunas: origem recebe a concatenação e a coluna
            // escolhida (destino) é removida depois da união
            unir_colunas_origem: null,
            unir_colunas_destino: "",

            // Renomeação feita no próprio cabeçalho da coluna (sem prompt)
            coluna_em_edicao: null,
            nome_em_edicao: "",
            erro_renomear: "",
            operacoes_colunas: {
                "Coluna": ["renomear"],
                "Nome": ["primeiro_nome", "nome_e_sobrenome"],
                "CPF": ["cpf_com_ponto", "cpf_sem_ponto"],
                "Telefone": ["telefone_padrao_meta", "limpa_telefone", "adiciona_parenteses"],
                "Combinar": ["unir_colunas"]
            },

            // Nomes exibidos no menu da coluna (também usados no histórico)
            rotulos_operacoes: {
                "renomear": "Renomear coluna",
                "primeiro_nome": "Só o primeiro nome",
                "nome_e_sobrenome": "Nome e sobrenome",
                "cpf_com_ponto": "CPF com pontos",
                "cpf_sem_ponto": "CPF só com números",
                "telefone_padrao_meta": "Telefone com 55 no início",
                "limpa_telefone": "Telefone só com DDD e número",
                "adiciona_parenteses": "Telefone com parênteses",
                "unir_colunas": "Unir colunas"
            },

            // Texto de apoio mostrado embaixo do nome no menu da coluna
            dicas_operacoes: {
                "renomear": "Edita o nome no próprio cabeçalho",
                "primeiro_nome": "\"Ana Souza Lima\" vira \"Ana\"",
                "nome_e_sobrenome": "\"Ana Souza Lima\" vira \"Ana Souza\"",
                "cpf_com_ponto": "000.000.000-00",
                "cpf_sem_ponto": "Remove pontos e traço",
                "telefone_padrao_meta": "Formato Meta/WhatsApp: 55 + DDD + número",
                "limpa_telefone": "Remove 55, símbolos e o 9 extra",
                "adiciona_parenteses": "(11) 99999-9999",
                "unir_colunas": "Concatena com outra coluna, sem espaço"
            },

            // Pilha de estados anteriores para desfazer as alterações
            historico: [],
            limite_historico: 30
        };
    },

    computed: {
        total_linhas() {
            return this.dados_completos.length;
        },

        // 0 em "linhas_por_pagina" significa "Todas"
        tamanho_pagina() {
            if (this.linhas_por_pagina > 0) return this.linhas_por_pagina;
            return Math.max(this.total_linhas, 1);
        },

        total_paginas() {
            return Math.max(1, Math.ceil(this.total_linhas / this.tamanho_pagina));
        },

        dados_tabela() {
            const inicio = (this.pagina_atual - 1) * this.tamanho_pagina;
            return this.dados_completos.slice(inicio, inicio + this.tamanho_pagina);
        },

        inicio_exibicao() {
            if (this.total_linhas === 0) return 0;
            return (this.pagina_atual - 1) * this.tamanho_pagina + 1;
        },

        fim_exibicao() {
            return Math.min(this.pagina_atual * this.tamanho_pagina, this.total_linhas);
        },

        // Lista de páginas com reticências quando houver muitas páginas
        paginas_visiveis() {
            const total = this.total_paginas;
            const atual = this.pagina_atual;

            if (total <= 9) {
                return Array.from({ length: total }, (_, indice) => indice + 1);
            }

            const janela = 2;
            let inicio = Math.max(2, atual - janela);
            let fim = Math.min(total - 1, atual + janela);

            if (atual <= 3) fim = Math.min(total - 1, 5);
            if (atual >= total - 2) inicio = Math.max(2, total - 4);

            const paginas = [1];

            if (inicio > 2) paginas.push("...");

            for (let pagina = inicio; pagina <= fim; pagina++) {
                paginas.push(pagina);
            }

            if (fim < total - 1) paginas.push("...");

            paginas.push(total);

            return paginas;
        },

        pode_desfazer() {
            return this.historico.length > 0;
        },

        // Rótulo da alteração que o botão Desfazer vai reverter
        ultima_alteracao() {
            const ultima = this.historico[this.historico.length - 1];
            return ultima ? ultima.rotulo : "";
        },

        // Colunas que podem ser concatenadas com a coluna de origem
        colunas_para_unir() {
            if (!this.unir_colunas_origem) return [];

            return this.colunas_tabela.filter(coluna => coluna !== this.unir_colunas_origem);
        },

        // Exemplo com a primeira linha preenchida, usado na prévia do modal
        exemplo_uniao() {
            const origem = this.unir_colunas_origem;
            const destino = this.unir_colunas_destino;

            if (!origem || !destino) return null;

            const para_texto = (valor) => valor === null || valor === undefined
                ? ""
                : String(valor).trim();

            const linha = this.dados_completos.find(item =>
                concatenar_valores(item[origem], item[destino]) !== "");

            if (!linha) return null;

            return {
                origem: para_texto(linha[origem]),
                destino: para_texto(linha[destino]),
                resultado: concatenar_valores(linha[origem], linha[destino])
            };
        }
    },

    watch: {
        linhas_por_pagina() {
            this.pagina_atual = 1;
        },

        total_paginas() {
            if (this.pagina_atual > this.total_paginas) {
                this.pagina_atual = this.total_paginas;
            }
        }
    },

    methods: {
        formatar_tamanho,

        handle_clique_fora(event) {
            const clicou_no_menu = event.target.closest('.dropdown-menu');
            const clicou_no_botao = event.target.closest('.btn-menu-coluna');

            if (!clicou_no_menu && !clicou_no_botao) {
                this.fechar_menu_coluna();
            }
        },

        async selecionar_arquivo(event) {
            const arquivo = event.target.files[0];
            if (!arquivo) return;
            this.arquivo_selecionado = arquivo;
            await this.ler_tabela(arquivo);
        },

        remover_arquivo() {
            this.arquivo_selecionado = null;
            this.workbook = null;
            this.abas_disponiveis = [];
            this.aba_selecionada = "";
            this.colunas_tabela = [];
            this.dados_completos = [];
            this.pagina_atual = 1;
            this.historico = [];
            this.fechar_menu_coluna();
            this.fechar_unir_colunas();
            this.cancelar_renomear_coluna();
            document.getElementById("file-input").value = "";
        },
        
        async ler_tabela(arquivo) {

            try {

                const dados = await arquivo.arrayBuffer();

                const workbook = XLSX.read(dados, {
                    type: "array",
                    cellDates: true
                });

                // markRaw evita que o Vue torne o workbook inteiro reativo
                this.workbook = markRaw(workbook);
                this.abas_disponiveis = [...workbook.SheetNames];

                // Prioriza a aba principal definida no próprio arquivo (activeTab)
                const visoes = workbook.Workbook
                    && (workbook.Workbook.WBView || workbook.Workbook.Views);
                const aba_ativa = Array.isArray(visoes) && visoes[0]
                    ? Number(visoes[0].activeTab)
                    : NaN;

                this.aba_selecionada = Number.isInteger(aba_ativa)
                    && this.abas_disponiveis[aba_ativa]
                    ? this.abas_disponiveis[aba_ativa]
                    : (this.abas_disponiveis[0] || "");

                this.carregar_aba(this.aba_selecionada);

            } catch (erro) {

                console.error("Erro ao ler a tabela:", erro);

                this.arquivo_selecionado = null;
                this.workbook = null;
                this.abas_disponiveis = [];
                this.aba_selecionada = "";
                this.colunas_tabela = [];
                this.dados_completos = [];
                this.pagina_atual = 1;
                this.historico = [];
            }
        },

        // Carrega os dados da aba escolhida a partir do workbook original
        carregar_aba(nome_aba) {
            this.cancelar_renomear_coluna();
            this.fechar_unir_colunas();

            const planilha = nome_aba && this.workbook
                ? this.workbook.Sheets[nome_aba]
                : null;

            if (!planilha) {
                this.dados_completos = [];
                this.colunas_tabela = [];
                this.pagina_atual = 1;
                this.historico = [];
                this.fechar_menu_coluna();
                return;
            }

            const dados_json = XLSX.utils.sheet_to_json(planilha, {
                defval: ""
            });

            // Formata as datas
            this.dados_completos = dados_json.map(linha => {

                const nova_linha = {};

                for (let coluna in linha) {

                    const valor = linha[coluna];

                    if (valor instanceof Date) {
                        nova_linha[coluna] = formatar_data(valor);
                    } else {
                        nova_linha[coluna] = valor;
                    }

                }

                return nova_linha;
            });

            this.colunas_tabela = this.dados_completos.length > 0
                ? Object.keys(this.dados_completos[0])
                : [];

            // A paginação controla apenas a exibição
            this.pagina_atual = 1;
            // O histórico pertence aos dados da aba carregada
            this.historico = [];
            this.fechar_menu_coluna();
        },

        trocar_aba() {
            this.carregar_aba(this.aba_selecionada);
        },
        
        // Abre o menu abaixo do botão garantindo que ele caiba na janela
        abrir_menu_coluna(coluna, event) {
            if (!this.colunas_tabela.includes(coluna)) return;

            const margem = 8;
            const largura_max = 320;
            const rect = event.currentTarget.getBoundingClientRect();

            const left_minimo = window.scrollX + margem;
            const left_maximo = window.scrollX + window.innerWidth - margem - largura_max;

            this.menu_coluna_aberto = coluna;
            this.menu_posicao = {
                top: rect.bottom + window.scrollY + 6,
                left: Math.max(left_minimo, Math.min(rect.left + window.scrollX, left_maximo))
            };

            // Reajusta com as medidas reais depois da renderização e de novo
            // no próximo quadro, já com o reflow das fontes aplicado
            const ajustar = () => this.ajustar_menu_coluna(rect, margem);

            this.$nextTick(ajustar);
            requestAnimationFrame(ajustar);
        },

        ajustar_menu_coluna(rect, margem) {
            const menu = this.$refs.menu_coluna;
            if (!menu) return;

            const caixa = menu.getBoundingClientRect();
            const janela_largura = window.innerWidth;
            const janela_altura = window.innerHeight;

            let left = this.menu_posicao.left;
            let top = this.menu_posicao.top;

            // Não deixa vazar pela direita nem pela esquerda
            const excesso_direita = caixa.right - (janela_largura - margem);
            if (excesso_direita > 0) left -= excesso_direita;

            const excesso_esquerda = margem - caixa.left;
            if (excesso_esquerda > 0) left += excesso_esquerda;

            // Prefere abrir embaixo; se não couber, abre para cima do botão
            const espaco_embaixo = janela_altura - margem - rect.bottom - 6;
            const espaco_acima = rect.top - margem - 6;

            if (caixa.height > espaco_embaixo && caixa.height <= espaco_acima) {
                top = rect.top + window.scrollY - caixa.height - 6;
            }

            // Nunca deixa o menu passar das bordas da janela
            const top_maximo = window.scrollY + Math.max(margem, janela_altura - 2 * margem - caixa.height);
            top = Math.max(window.scrollY + margem, Math.min(top, top_maximo));

            if (left !== this.menu_posicao.left || top !== this.menu_posicao.top) {
                this.menu_posicao = { top, left };
            }
        },

        fechar_menu_coluna() {
            this.menu_coluna_aberto = null;
        },

        executar_operacao(coluna, operacao) {
            if (operacao === "renomear") {
                this.iniciar_renomear_coluna(coluna);
                return;
            }

            // União de colunas tem uma segunda etapa: escolher a outra coluna
            if (operacao === "unir_colunas") {
                this.iniciar_unir_colunas(coluna);
                return;
            }

            const transformacoes = {
                primeiro_nome: pegar_primeiro_nome,
                nome_e_sobrenome: pegar_primeiro_e_segundo_nome,
                cpf_sem_ponto: limpar_cpf,
                cpf_com_ponto: formatar_cpf,
                limpa_telefone: limpar_telefone,
                telefone_padrao_meta: formatar_telefone_padrao_meta,
                adiciona_parenteses: adicionar_parenteses
            };

            const transformacao = transformacoes[operacao];

            if (transformacao) {
                const rotulo = `${this.rotulos_operacoes[operacao] || operacao} · ${coluna}`;
                this.aplicar_na_coluna(coluna, transformacao, rotulo);
            }

            this.fechar_menu_coluna();
        },

        // Aplica uma transformação em toda a coluna e registra o estado anterior.
        // Não gera histórico quando nenhum valor é alterado.
        aplicar_na_coluna(coluna, transformacao, rotulo) {
            let alterou = false;

            const novos_dados = this.dados_completos.map(linha => {
                const valor_atual = linha[coluna];
                const novo_valor = transformacao(valor_atual);

                if (novo_valor !== valor_atual) alterou = true;

                return { ...linha, [coluna]: novo_valor };
            });

            if (!alterou) return false;

            this.registrar_alteracao(rotulo);
            this.dados_completos = novos_dados;

            return true;
        },

        // Guarda o estado anterior na pilha de desfazer.
        // As operações sempre criam novos arrays/linhas (nunca alteram no lugar),
        // então basta manter as referências — sem clonar os dados.
        registrar_alteracao(rotulo) {
            this.historico.push({
                dados: this.dados_completos,
                colunas: this.colunas_tabela,
                rotulo
            });

            if (this.historico.length > this.limite_historico) {
                this.historico.shift();
            }
        },

        desfazer_alteracao() {
            const estado_anterior = this.historico.pop();
            if (!estado_anterior) return;

            this.dados_completos = estado_anterior.dados;
            this.colunas_tabela = estado_anterior.colunas;

            this.fechar_menu_coluna();
            this.cancelar_renomear_coluna();

            if (this.pagina_atual > this.total_paginas) {
                this.pagina_atual = this.total_paginas;
            }
        },

        // Ctrl+Z / Cmd+Z desfaz a última alteração (fora de campos de digitação)
        atalho_desfazer(event) {
            const tecla_z = String(event.key).toLowerCase() === "z";

            if (!tecla_z || !(event.ctrlKey || event.metaKey) || event.shiftKey) return;

            const alvo = event.target;
            const campo_de_texto = alvo && (
                alvo.tagName === "INPUT"
                || alvo.tagName === "TEXTAREA"
                || alvo.tagName === "SELECT"
                || alvo.isContentEditable
            );

            if (campo_de_texto || !this.pode_desfazer) return;

            event.preventDefault();
            this.desfazer_alteracao();
        },

        apagar_coluna(coluna) {
            if (!this.colunas_tabela.includes(coluna)) return;

            if (this.coluna_em_edicao === coluna) this.cancelar_renomear_coluna();

            this.registrar_alteracao(`Apagar coluna · ${coluna}`);

            this.colunas_tabela = this.colunas_tabela.filter(c => c !== coluna);

            this.dados_completos = this.dados_completos.map(linha => {
                const nova_linha = { ...linha };
                delete nova_linha[coluna];
                return nova_linha;
            });
        },

        // Abre o seletor da segunda coluna que será concatenada com a atual
        iniciar_unir_colunas(coluna) {
            if (!this.colunas_tabela.includes(coluna)) return;

            this.fechar_menu_coluna();
            this.cancelar_renomear_coluna();

            if (this.colunas_tabela.length < 2) {
                console.warn("É preciso ter pelo menos duas colunas para unir.");
                return;
            }

            this.unir_colunas_origem = coluna;
            this.unir_colunas_destino = "";
        },

        fechar_unir_colunas() {
            this.unir_colunas_origem = null;
            this.unir_colunas_destino = "";
        },

        // Concatena as duas colunas linha por linha, sem espaço entre os valores.
        // O resultado fica na coluna de origem e a coluna escolhida é removida.
        confirmar_unir_colunas() {
            const origem = this.unir_colunas_origem;
            const destino = this.unir_colunas_destino;

            if (!origem || !destino || origem === destino) return;

            if (!this.colunas_tabela.includes(origem) || !this.colunas_tabela.includes(destino)) return;

            this.registrar_alteracao(`Unir colunas · ${origem} + ${destino}`);

            this.dados_completos = this.dados_completos.map(linha => {
                const nova_linha = {};
                let uniu = false;

                for (const chave in linha) {
                    if (chave === destino) continue;

                    if (chave === origem) {
                        nova_linha[chave] = concatenar_valores(linha[origem], linha[destino]);
                        uniu = true;
                        continue;
                    }

                    nova_linha[chave] = linha[chave];
                }

                // Linha sem a coluna de origem ainda recebe o resultado
                if (!uniu) {
                    nova_linha[origem] = concatenar_valores(linha[origem], linha[destino]);
                }

                return nova_linha;
            });

            this.colunas_tabela = this.colunas_tabela.filter(coluna => coluna !== destino);

            this.fechar_unir_colunas();
            this.fechar_menu_coluna();
        },

        // Esc fecha o seletor de união de colunas
        atalho_fechar_uniao(event) {
            if (event.key !== "Escape" || !this.unir_colunas_origem) return;

            event.preventDefault();
            this.fechar_unir_colunas();
        },

        baixar_tabela_padronizada() {
            if (!this.dados_completos || this.dados_completos.length === 0) {
                console.warn("Nenhum dado disponível para download.");
                return;
            }

            try {
                // Filtra os dados completos para manter apenas as colunas ativas da tabela
                const dados_filtrados = this.dados_completos.map(linha => {
                    const nova_linha = {};
                    this.colunas_tabela.forEach(coluna => {
                        nova_linha[coluna] = linha[coluna] !== undefined ? linha[coluna] : "";
                    });
                    return nova_linha;
                });

                // Cria uma nova planilha do Excel utilizando os dados tratados
                const worksheet = XLSX.utils.json_to_sheet(dados_filtrados);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Dados Padronizados");

                // Formato escolhido pelo usuário (CSV é o padrão)
                const formato = this.formato_download || "csv";
                const opcoes_escrita = { bookType: formato };

                if (formato === "csv") {
                    // Define o separador de colunas explicitamente como ponto e vírgula
                    opcoes_escrita.FS = ";";
                }

                // Com mais de uma aba, inclui o nome da aba no arquivo exportado
                const nome_arquivo = this.abas_disponiveis.length > 1 && this.aba_selecionada
                    ? `tabela_padronizada_${this.aba_selecionada.replace(/[\\/:*?"<>|]/g, "").trim()}`
                    : "tabela_padronizada";

                XLSX.writeFile(workbook, `${nome_arquivo}.${formato}`, opcoes_escrita);
            } catch (erro) {
                console.error("Erro ao gerar e baixar a planilha:", erro);
            }
        },

        prevenir_padrao(event) {
            event.preventDefault();
        },

        async lidar_com_drop(event) {
            event.preventDefault();
            const arquivo = event.dataTransfer.files[0];
            if (!arquivo) return;

            this.arquivo_selecionado = arquivo;
            await this.ler_tabela(arquivo);
        },

        // Abre o campo de edição dentro do próprio cabeçalho da coluna
        iniciar_renomear_coluna(coluna) {
            if (!this.colunas_tabela.includes(coluna)) return;

            this.coluna_em_edicao = coluna;
            this.nome_em_edicao = coluna;
            this.erro_renomear = "";
            this.fechar_menu_coluna();

            // Espera o input existir para focar e já deixar o nome selecionado
            this.$nextTick(() => {
                const input = this.input_renomear();
                if (!input) return;
                input.focus();
                input.select();
            });
        },

        input_renomear() {
            return document.querySelector("[data-renomear-input]");
        },

        digitou_nome_coluna(event) {
            this.nome_em_edicao = event.target.value;
            if (this.erro_renomear) this.erro_renomear = "";
        },

        cancelar_renomear_coluna() {
            this.coluna_em_edicao = null;
            this.nome_em_edicao = "";
            this.erro_renomear = "";
        },

        // Enter confirma; se o nome não servir, o campo continua aberto com o aviso
        confirmar_renomear_coluna() {
            const coluna_antiga = this.coluna_em_edicao;
            if (!coluna_antiga) return;

            const novo_nome = String(this.nome_em_edicao || "").trim();

            const mostrar_erro = (mensagem) => {
                this.erro_renomear = mensagem;
                this.$nextTick(() => {
                    const input = this.input_renomear();
                    if (input) input.focus();
                });
            };

            if (!novo_nome) {
                mostrar_erro("Digite um nome para a coluna");
                return;
            }

            // Nome igual (ou só com espaços a mais): apenas fecha o campo
            if (novo_nome === coluna_antiga) {
                this.cancelar_renomear_coluna();
                return;
            }

            if (this.colunas_tabela.includes(novo_nome)) {
                mostrar_erro("Já existe uma coluna com esse nome");
                return;
            }

            // Permite desfazer a renomeação
            this.registrar_alteracao(`Renomear coluna · ${coluna_antiga} → ${novo_nome}`);

            // 1. Atualiza o array de colunas da tabela
            this.colunas_tabela = this.colunas_tabela.map(col => col === coluna_antiga ? novo_nome : col);

            // 2. Atualiza os dados completos renomeando a chave em cada linha
            this.dados_completos = this.dados_completos.map(linha => {
                const nova_linha = {};
                for (const chave in linha) {
                    if (chave === coluna_antiga) {
                        nova_linha[novo_nome] = linha[chave];
                    } else {
                        nova_linha[chave] = linha[chave];
                    }
                }
                return nova_linha;
            });

            this.cancelar_renomear_coluna();
        },

        // Sair do campo (clique fora ou Tab) salva quando o nome é válido.
        // Se estiver vazio ou repetido, apenas fecha o campo para não prender o foco.
        sair_do_campo_renomear() {
            if (!this.coluna_em_edicao) return;

            const nome_limpo = String(this.nome_em_edicao || "").trim();
            const nome_invalido = !nome_limpo || this.colunas_tabela.includes(nome_limpo);

            if (nome_invalido) {
                this.cancelar_renomear_coluna();
                return;
            }

            this.confirmar_renomear_coluna();
        },

        ir_para_pagina(pagina) {
            const destino = Math.min(Math.max(1, Number(pagina)), this.total_paginas);

            if (Number.isNaN(destino) || destino === this.pagina_atual) return;

            this.pagina_atual = destino;

            this.$nextTick(() => {
                const wrapper = document.querySelector(".preview-wrapper");
                if (wrapper) wrapper.scrollTop = 0;
            });
        },

        pagina_anterior() {
            this.ir_para_pagina(this.pagina_atual - 1);
        },

        proxima_pagina() {
            this.ir_para_pagina(this.pagina_atual + 1);
        }
    },

    mounted() {
        document.addEventListener("click", this.handle_clique_fora);
        document.addEventListener("keydown", this.atalho_desfazer);
        document.addEventListener("keydown", this.atalho_fechar_uniao);
        // Adiciona os eventos de Drag and Drop
        const dropArea = document.getElementById("drop-area");
        if (dropArea) {
            dropArea.addEventListener("dragover", this.prevenir_padrao);
            dropArea.addEventListener("drop", this.lidar_com_drop);
        }
    },

    beforeUnmount() {
        document.removeEventListener("click", this.handle_clique_fora);
        document.removeEventListener("keydown", this.atalho_desfazer);
        document.removeEventListener("keydown", this.atalho_fechar_uniao);

        // Remove os eventos para evitar vazamento de memória
        const dropArea = document.getElementById("drop-area");
        if (dropArea) {
            dropArea.removeEventListener("dragover", this.prevenir_padrao);
            dropArea.removeEventListener("drop", this.lidar_com_drop);
        }
    },

}).mount('#app');