// =====================================================================
// MOTOR DE RATEIO (a "conta")
// Funções puras: recebem números, devolvem números. Não mexem no banco
// nem em tela. Por isso são fáceis de testar e de levar para o backend.
//
// Fórmula do README:
//   valor final = (energia em kWh x tarifa do kWh) + taxa administrativa
//   taxa administrativa = valor fixo + (percentual x valor da energia)
// =====================================================================

import type { LinhaRateio, SessaoParaRateio } from "../types/rateio";

export interface ParametrosRateio {
  valorKwh: number; // R$ por kWh (vem da tarifa)
  valorFixo: number; // R$ fixo de taxa (vem da regra)
  percentualTaxa: number; // 5 significa 5% (vem da regra)
}

// Só sessões que já terminaram e entregaram energia são cobradas.
// "interrompida" entra: paga só o que foi entregue (energia_kwh já é isso).
// "cancelada", "erro" e sessões ainda abertas ficam de fora.
export const STATUS_COBRAVEIS = ["finalizada", "interrompida"] as const;

// Arredonda para 2 casas (centavos).
export function arredondar(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function arredondarKwh(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 1000) / 1000;
}

// Calcula UMA fatura a partir da energia total de um usuário.
// Devolve null se não houve consumo (usuário sem uso = sem cobrança).
export function calcularValores(energiaKwh: number, p: ParametrosRateio) {
  if (!(energiaKwh > 0)) {
    return null;
  }

  const valorEnergia = arredondar(energiaKwh * p.valorKwh);
  const valorTaxa = arredondar(
    p.valorFixo + (valorEnergia * p.percentualTaxa) / 100,
  );

  return {
    energiaKwh: arredondarKwh(energiaKwh),
    valorEnergia,
    valorTaxa,
    valorTotal: arredondar(valorEnergia + valorTaxa),
  };
}

// Agrupa as sessões por usuário, soma a energia e calcula cada fatura.
// Dois veículos do mesmo usuário caem na mesma fatura automaticamente,
// porque o agrupamento é por usuário.
export function calcularRateio(
  sessoes: SessaoParaRateio[],
  parametros: ParametrosRateio,
): LinhaRateio[] {
  const porUsuario = new Map<string, { energia: number; sessoes: number }>();

  for (const sessao of sessoes) {
    const atual = porUsuario.get(sessao.usuario_id) ?? { energia: 0, sessoes: 0 };
    atual.energia += Number(sessao.energia_kwh);
    atual.sessoes += 1;
    porUsuario.set(sessao.usuario_id, atual);
  }

  const linhas: LinhaRateio[] = [];

  for (const [usuario_id, total] of porUsuario) {
    const valores = calcularValores(total.energia, parametros);

    if (valores) {
      linhas.push({ usuario_id, sessoes: total.sessoes, ...valores });
    }
  }

  return linhas;
}
