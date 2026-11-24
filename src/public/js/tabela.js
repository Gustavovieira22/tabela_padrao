import {formatar_tamanho, pegar_primeiro_nome, 
        pegar_primeiro_e_segundo_nome, limpar_cpf, formatar_cpf,
        limpar_telefone, formatar_telefone_padrao_meta,
        adicionar_parenteses, formatar_data} from "./utils.js"
const { createApp } = Vue;

createApp({
    data() {
        return {
            arquivo_selecionado: null,

            dados_completos: [],
            dados_tabela: [],
            colunas_tabela: [],

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
            this.colunas_tabela = [];
            this.dados_tabela = [];
            document.getElementById("file-input").value = "";
        },
        
        async ler_tabela(arquivo) {

            try {

                const dados = await arquivo.arrayBuffer();

                const workbook = XLSX.read(dados, {
                    type: "array",
                    cellDates: true
                });

                const nome_planilha = workbook.SheetNames[0];

                const planilha = workbook.Sheets[nome_planilha];

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

                // Usa os dados já formatados na prévia
                this.dados_tabela = this.dados_completos
                    .slice(0, 10)
                    .map(linha => ({ ...linha }));

                if (this.dados_tabela.length > 0) {

                    this.colunas_tabela = Object.keys(
                        this.dados_tabela[0]
                    );

                }

            } catch (erro) {

                console.error("Erro ao ler a tabela:", erro);

                this.arquivo_selecionado = null;
                this.colunas_tabela = [];
                this.dados_tabela = [];
            }
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

            this.dados_tabela = this.dados_completos.slice(0, 10);
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

                // Dispara o download do arquivo .xlsx
                //XLSX.writeFile(workbook, "tabela_padronizada.xlsx");
                XLSX.writeFile(workbook, "tabela_padronizada.csv", { 
                    bookType: "csv", 
                    FS: ";" // Define o separador de colunas explicitamente como ponto e vírgula
                });
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

            // 3. Atualiza a prévia da tabela
            this.dados_tabela = this.dados_completos.slice(0, 10);
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