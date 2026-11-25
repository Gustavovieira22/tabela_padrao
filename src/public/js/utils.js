// Erro disparado quando um valor não pode ser padronizado.
// Quem chama decide o que fazer: na interface o valor original é preservado
// e o registro vai para a aba "Erros" do arquivo baixado.
export class ErroPadronizacao extends Error {
    constructor(motivo) {
        super(motivo);
        this.name = "ErroPadronizacao";
        this.motivo = motivo;
    }
}

// Célula vazia não é erro: não há o que padronizar, então ela continua vazia
function valor_vazio(valor) {
    return valor === null || valor === undefined || String(valor).trim() === "";
}

function apenas_numeros(valor) {
    return String(valor).replace(/\D/g, "");
}

export function formatar_tamanho(bytes) {
    if (bytes < 1024) 
        return `${bytes} Bytes`;
    
    if (bytes < 1024 * 1024) 
        return `${(bytes / 1024).toFixed(2)} KB`;
    
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function pegar_primeiro_nome(nome_completo) {
    if (!nome_completo) return "";

    return String(nome_completo)
        .trim()
        .split(/\s+/)[0];
}

export function pegar_primeiro_e_segundo_nome(nome_completo) {
    if (!nome_completo) return "";

    const ignorar = ["de", "da", "do", "das", "dos", "e"];
    const partes = String(nome_completo)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (partes.length === 0) return "";

    const primeiro = partes[0];
    let segundo = "";

    for (let i = 1; i < partes.length; i++) {
        const parte = partes[i].toLowerCase();

        if (!ignorar.includes(parte)) {
            segundo = partes[i];
            break;
        }
    }

    return segundo ? `${primeiro} ${segundo}` : primeiro;
}

export function formatar_cpf(cpf) {
    if (valor_vazio(cpf)) return "";

    const numeros = apenas_numeros(cpf);

    if (!numeros) {
        throw new ErroPadronizacao("Nenhum número encontrado no CPF");
    }

    if (numeros.length !== 11) {
        throw new ErroPadronizacao(`CPF com ${numeros.length} dígito(s), esperado 11`);
    }

    return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function limpar_cpf(cpf) {
    if (valor_vazio(cpf)) return "";

    const numeros = apenas_numeros(cpf);

    if (!numeros) {
        throw new ErroPadronizacao("Nenhum número encontrado no CPF");
    }

    if (numeros.length !== 11) {
        throw new ErroPadronizacao(`CPF com ${numeros.length} dígito(s), esperado 11`);
    }

    return numeros;
}

export function limpar_telefone(telefone) {
    if (valor_vazio(telefone)) return "";

    let numeros = apenas_numeros(telefone);

    if (!numeros) {
        throw new ErroPadronizacao("Nenhum número encontrado no telefone");
    }

    // Remove 55 do início
    if (numeros.startsWith("55") && (numeros.length === 12 || numeros.length === 13)) {
        numeros = numeros.slice(2);
    }

    // Se tiver 11 dígitos e o terceiro for 9, remove o 9 adicional
    if (numeros.length === 11 && numeros[2] === "9") {
        numeros = numeros.slice(0, 2) + numeros.slice(3);
    }

    // No final, o esperado é DDD + telefone = 10 dígitos
    if (numeros.length !== 10) {
        throw new ErroPadronizacao(`Telefone com ${numeros.length} dígito(s) após a limpeza, esperado 10`);
    }

    return numeros;
}

export function formatar_telefone_padrao_meta(telefone) {
    const telefone_limpo = limpar_telefone(telefone);

    if (telefone_limpo === "") return "";

    return "55" + telefone_limpo;
}

export function adicionar_parenteses(telefone) {
    const telefone_limpo = limpar_telefone(telefone);

    if (telefone_limpo === "") return "";

    const ddd = telefone_limpo.slice(0, 2);
    const numero = telefone_limpo.slice(2); // 8 dígitos
    const numero_com_nove = "9" + numero;

    return `(${ddd})${numero_com_nove.slice(0, 5)}-${numero_com_nove.slice(5)}`;
}

// Junta dois valores em um único texto, sem espaço entre eles
export function concatenar_valores(primeiro, segundo) {
    const parte_1 = primeiro === null || primeiro === undefined
        ? ""
        : String(primeiro).trim();

    const parte_2 = segundo === null || segundo === undefined
        ? ""
        : String(segundo).trim();

    return parte_1 + parte_2;
}

export function formatar_data(valor) {
    if (!valor) return "";
    
    // Se o SheetJS já converteu para um objeto Date
    let data = valor instanceof Date ? valor : new Date(valor);
    
    if (isNaN(data.getTime())) return valor; // Retorna o valor original se não for uma data válida

    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const horas = String(data.getHours()).padStart(2, '0');
    const minutos = String(data.getMinutes()).padStart(2, '0');

    return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
}