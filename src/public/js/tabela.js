import {formatar_tamanho, pegar_primeiro_nome, 
        pegar_primeiro_e_segundo_nome, limpar_cpf, formatar_cpf,
        limpar_telefone, formatar_telefone_padrao_meta,
        adicionar_parenteses, formatar_data} from "./utils.js"
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
            operacoes_colunas: {
                "Coluna": ["renomear"],
                "Telefone": ["telefone_padrao_meta", "limpa_telefone", "adiciona_parenteses"],
                "Nome": ["primeiro_nome", "nome_e_sobrenome"],
                "CPF": ["cpf_com_ponto", "cpf_sem_ponto"],
            }
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
            this.fechar_menu_coluna();
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
            }
        },

        // Carrega os dados da aba escolhida a partir do workbook original
        carregar_aba(nome_aba) {
            const planilha = nome_aba && this.workbook
                ? this.workbook.Sheets[nome_aba]
                : null;

            if (!planilha) {
                this.dados_completos = [];
                this.colunas_tabela = [];
                this.pagina_atual = 1;
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
            this.fechar_menu_coluna();
        },

        trocar_aba() {
            this.carregar_aba(this.aba_selecionada);
        },
        
        abrir_menu_coluna(coluna, event) {
            const rect = event.currentTarget.getBoundingClientRect();

            this.menu_coluna_aberto = coluna;
            this.menu_posicao = {
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX
            };
        },

        fechar_menu_coluna() {
            this.menu_coluna_aberto = null;
        },

        executar_operacao(coluna, operacao) {
            if(operacao == "renomear"){
                this.renomear_coluna(coluna);
            }
            if (operacao === "primeiro_nome") {
                this.aplicar_primeiro_nome(coluna);
            }

            if (operacao === "nome_e_sobrenome") {
                this.aplicar_primeiro_e_segundo_nome(coluna);
            }

            if (operacao === "cpf_sem_ponto") {
                this.aplicar_cpf_sem_ponto(coluna);
            }

            if (operacao === "cpf_com_ponto") {
                this.aplicar_cpf_com_ponto(coluna);
            }

            if (operacao === "limpa_telefone") {
                this.aplicar_limpa_telefone(coluna);
            }

            if (operacao === "telefone_padrao_meta") {
                this.aplicar_telefone_padrao_meta(coluna);
            }
            
            if (operacao === "adiciona_parenteses") {
                this.aplicar_adiciona_parenteses(coluna);
            }

            this.fechar_menu_coluna();
        },

        aplicar_primeiro_nome(coluna) {
            this.dados_completos = this.dados_completos.map(linha => {
                return {
                    ...linha,
                    [coluna]: pegar_primeiro_nome(linha[coluna])
                };
            });
        },

        aplicar_primeiro_e_segundo_nome(coluna) {
            this.dados_completos = this.dados_completos.map(linha => {
                return {
                    ...linha,
                    [coluna]: pegar_primeiro_e_segundo_nome(linha[coluna])
                };
            });
        },

        apagar_coluna(coluna) {
            this.colunas_tabela = this.colunas_tabela.filter(c => c !== coluna);

            this.dados_completos = this.dados_completos.map(linha => {
                const nova_linha = { ...linha };
                delete nova_linha[coluna];
                return nova_linha;
            });
        },

        aplicar_cpf_sem_ponto(coluna) {
            this.dados_completos = this.dados_completos.map(linha => {
                return {
                    ...linha,
                    [coluna]: limpar_cpf(linha[coluna])
                };
            });
        },

        aplicar_cpf_com_ponto(coluna) {
            this.dados_completos = this.dados_completos.map(linha => {
                return {
                    ...linha,
                    [coluna]: formatar_cpf(linha[coluna])
                };
            });
        },
        aplicar_limpa_telefone(coluna) {
            this.dados_completos = this.dados_completos.map(linha => {
                return {
                    ...linha,
                    [coluna]: limpar_telefone(linha[coluna])
                };
            });
        },
        aplicar_telefone_padrao_meta(coluna) {
            this.dados_completos = this.dados_completos.map(linha => {
                return {
                    ...linha,
                    [coluna]: formatar_telefone_padrao_meta(linha[coluna])
                };
            });
        },
        aplicar_adiciona_parenteses(coluna) {
            this.dados_completos = this.dados_completos.map(linha => {
                return {
                    ...linha,
                    [coluna]: adicionar_parenteses(linha[coluna])
                };
            });
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

        renomear_coluna(coluna_antiga) {
            const novo_nome = prompt(`Digite o novo nome para a coluna "${coluna_antiga}":`, coluna_antiga);
            
            if (!novo_nome || novo_nome.trim() === "" || novo_nome === coluna_antiga) return;
            
            // Verifica se a coluna já existe para evitar conflito
            if (this.colunas_tabela.includes(novo_nome)) {
                alert("Já existe uma coluna com esse nome!");
                return;
            }

            // 1. Atualiza o array de colunas da tabela
            this.colunas_tabela = this.colunas_tabela.map(col => col === coluna_antiga ? novo_nome : col);

            // 2. Atualiza os dados completos renomeando a chave em cada linha
            this.dados_completos = this.dados_completos.map(linha => {
                const nova_linha = {};
                for (let chave in linha) {
                    if (chave === coluna_antiga) {
                        nova_linha[novo_nome] = linha[chave];
                    } else {
                        nova_linha[chave] = linha[chave];
                    }
                }
                return nova_linha;
            });
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
        // Adiciona os eventos de Drag and Drop
        const dropArea = document.getElementById("drop-area");
        if (dropArea) {
            dropArea.addEventListener("dragover", this.prevenir_padrao);
            dropArea.addEventListener("drop", this.lidar_com_drop);
        }
    },

    beforeUnmount() {
        document.removeEventListener("click", this.handle_clique_fora);

        // Remove os eventos para evitar vazamento de memória
        const dropArea = document.getElementById("drop-area");
        if (dropArea) {
            dropArea.removeEventListener("dragover", this.prevenir_padrao);
            dropArea.removeEventListener("drop", this.lidar_com_drop);
        }
    },

}).mount('#app');