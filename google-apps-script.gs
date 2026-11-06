// ============================================================================
// LA DOLCE BRASIL — GOOGLE APPS SCRIPT (BACKEND DA PLANILHA)
// Abas integradas:
//   1. "Visão Geral"        -> Leitura de indicadores, ficha técnica e acerto 50/50
//   2. "Vendas"             -> Registro de vendas
//   3. "Insumos e Despesas" -> Registro e leitura de insumos e despesas
// ============================================================================

// ============================================================================
// 1. LEITURA DA PLANILHA (GET) — VISÃO GERAL + INSUMOS E DESPESAS
// ============================================================================
function doGet(e) {
  try {
    var gestao = lerAbaVisaoGeral();
    var despesas = lerAbaDespesas();

    return ContentService.createTextOutput(
      JSON.stringify({
        status: "sucesso",
        gestao: gestao,
        despesas: despesas
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "erro",
        mensagem: err.toString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// 2. REGISTRO DE VENDAS OU DESPESAS + ATUALIZAÇÃO DA GESTÃO (POST)
// ============================================================================
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var dados = JSON.parse(e.postData.contents);

    // ------------------------------------------------------------------------
    // AÇÃO A: Apenas leitura via POST
    // ------------------------------------------------------------------------
    if (dados.acao === "lerGestao" || dados.acao === "lerTudo") {
      return ContentService.createTextOutput(
        JSON.stringify({
          status: "sucesso",
          gestao: lerAbaVisaoGeral(),
          despesas: lerAbaDespesas()
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ------------------------------------------------------------------------
    // AÇÃO B: Registrar Despesa na aba "Insumos e Despesas"
    // ------------------------------------------------------------------------
    if (dados.acao === "registrarDespesa" || dados.tipoRegistro === "despesa") {
      return registrarNovaDespesa(ss, dados);
    }

    // ------------------------------------------------------------------------
    // AÇÃO C (Padrão): Registrar Venda na aba "Vendas"
    // ------------------------------------------------------------------------
    return registrarNovaVenda(ss, dados);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "erro", mensagem: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// 2.1 FUNÇÃO PARA REGISTRAR VENDA NA ABA "VENDAS"
// ============================================================================
function registrarNovaVenda(ss, dados) {
  var todasAbas = ss.getSheets();
  var sheet = null;

  for (var i = 0; i < todasAbas.length; i++) {
    var nomeLimpo = todasAbas[i].getName().trim().toLowerCase();
    if (nomeLimpo === "vendas" || nomeLimpo === "venda") {
      sheet = todasAbas[i];
      break;
    }
  }

  if (!sheet) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "erro", mensagem: "Aba 'Vendas' não encontrada." })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  var dataAtual = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  var totalVenda = dados.valorTotal !== undefined ? dados.valorTotal : (dados.quantidade * dados.precoUnitario);

  var novaLinha = [
    dataAtual,                  // Coluna A: Data
    dados.item,                 // Coluna B: Sabor / Tipo
    dados.quantidade,           // Coluna C: Quantidade
    dados.precoUnitario,        // Coluna D: Preço Unitário (R$)
    totalVenda,                 // Coluna E: Total da Venda (R$)
    dados.formaPagamento,       // Coluna F: Forma de Pagamento
    dados.vendedor              // Coluna G: Recebido por (João ou Natan)
  ];

  // Encontra a primeira linha vazia olhando as Colunas A e B
  var ultimaLinha = sheet.getLastRow();
  var linhaDestino = 2;

  if (ultimaLinha >= 2) {
    var valoresAB = sheet.getRange(1, 1, ultimaLinha, 2).getValues();
    linhaDestino = ultimaLinha + 1;
    for (var r = 1; r < valoresAB.length; r++) {
      var colA = String(valoresAB[r][0]).trim();
      var colB = String(valoresAB[r][1]).trim();
      if (colA === "" && colB === "") {
        linhaDestino = r + 1;
        break;
      }
    }
  }

  sheet.getRange(linhaDestino, 1, 1, novaLinha.length).setValues([novaLinha]);
  SpreadsheetApp.flush();

  var gestaoAtualizada = null;
  var despesasAtualizadas = null;
  try {
    gestaoAtualizada = lerAbaVisaoGeral();
    despesasAtualizadas = lerAbaDespesas();
  } catch (ignorar) {}

  return ContentService.createTextOutput(
    JSON.stringify({
      status: "sucesso",
      aba: sheet.getName(),
      linha: linhaDestino,
      gestao: gestaoAtualizada,
      despesas: despesasAtualizadas
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// 2.2 FUNÇÃO PARA REGISTRAR DESPESA NA ABA "INSUMOS E DESPESAS"
// ============================================================================
function registrarNovaDespesa(ss, dados) {
  var sheet = localizarAbaDespesas(ss);

  if (!sheet) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "erro",
        mensagem: "Aba 'Insumos e Despesas' não encontrada na planilha."
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  // Usa a data enviada pelo app (dd/MM/yyyy) ou gera a data atual
  var dataLancamento = dados.data
    ? String(dados.data).trim()
    : Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

  var quantidade = Number(dados.quantidade) || 1;
  var valorTotal = Number(dados.valorTotal) || 0;

  // Estrutura idêntica à aba "Insumos e Despesas" (Colunas A até H)
  var novaLinha = [
    dataLancamento,                   // Coluna A: Data (dd/MM/yyyy)
    dados.categoria || "Ingredientes",// Coluna B: Categoria
    dados.descricao || "",            // Coluna C: Item / Descrição
    quantidade,                       // Coluna D: Quantidade
    valorTotal,                       // Coluna E: Valor Total (R$)
    dados.pagoPor || "Natan",         // Coluna F: Pago por (João ou Natan)
    dados.tipoGasto || "Insumo Direto",// Coluna G: Tipo de Gasto (Insumo Direto ou Gasto Esporádico)
    dados.observacoes || ""           // Coluna H: Observações
  ];

  // Localiza a primeira linha disponível verificando Coluna A (Data) e Coluna C (Item / Descrição)
  // Isso ignora os menus dropdown pré-formatados nas Colunas B, F e G!
  var ultimaLinha = sheet.getLastRow();
  var linhaDestino = 2;

  if (ultimaLinha >= 2) {
    var valoresAC = sheet.getRange(1, 1, ultimaLinha, 3).getValues();
    linhaDestino = ultimaLinha + 1;
    for (var r = 1; r < valoresAC.length; r++) {
      var colA = String(valoresAC[r][0]).trim();
      var colC = String(valoresAC[r][2]).trim();
      if (colA === "" && colC === "") {
        linhaDestino = r + 1;
        break;
      }
    }
  }

  // Insere a despesa na primeira linha disponível
  sheet.getRange(linhaDestino, 1, 1, novaLinha.length).setValues([novaLinha]);

  // Força o recálculo imediato das fórmulas da aba "Visão Geral"
  SpreadsheetApp.flush();

  var gestaoAtualizada = null;
  var despesasAtualizadas = null;
  try {
    gestaoAtualizada = lerAbaVisaoGeral();
    despesasAtualizadas = lerAbaDespesas();
  } catch (ignorar) {}

  return ContentService.createTextOutput(
    JSON.stringify({
      status: "sucesso",
      aba: sheet.getName(),
      linha: linhaDestino,
      gestao: gestaoAtualizada,
      despesas: despesasAtualizadas
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// 3. LEITURA DA ABA "INSUMOS E DESPESAS"
// ============================================================================
function localizarAbaDespesas(ss) {
  var todasAbas = ss.getSheets();
  for (var i = 0; i < todasAbas.length; i++) {
    var nomeLimpo = todasAbas[i].getName().trim().toLowerCase();
    if (
      nomeLimpo === "insumos e despesas" ||
      nomeLimpo === "despesas" ||
      nomeLimpo === "insumos" ||
      nomeLimpo.indexOf("despesa") !== -1
    ) {
      return todasAbas[i];
    }
  }
  return null;
}

function converterMoedaParaNumero(valorStr) {
  if (typeof valorStr === "number") return valorStr;
  var limpo = String(valorStr || "")
    .replace(/R\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  var num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
}

function lerAbaDespesas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = localizarAbaDespesas(ss);

  var resultado = {
    itens: [],
    resumo: {
      totalGeral: 0,
      insumosDiretos: 0,
      gastosEsporadicos: 0,
      pagoJoao: 0,
      pagoNatan: 0,
      quantidadeLancamentos: 0
    }
  };

  if (!sheet) return resultado;

  var ultimaLinha = sheet.getLastRow();
  if (ultimaLinha < 2) return resultado;

  var displayRows = sheet.getRange(2, 1, ultimaLinha - 1, 8).getDisplayValues();

  for (var r = 0; r < displayRows.length; r++) {
    var row = displayRows[r];
    var data = String(row[0] || "").trim();
    var categoria = String(row[1] || "").trim();
    var descricao = String(row[2] || "").trim();
    var quantidade = String(row[3] || "").trim();
    var valorTotalFmt = String(row[4] || "").trim();
    var pagoPor = String(row[5] || "").trim();
    var tipoGasto = String(row[6] || "").trim();
    var observacoes = String(row[7] || "").trim();

    // Ignora linhas em branco que possuem apenas validação de dados (dropdown vazio)
    if (data === "" && descricao === "") continue;

    var valorNum = converterMoedaParaNumero(valorTotalFmt);

    resultado.itens.push({
      linha: r + 2,
      data: data,
      categoria: categoria || "Outros",
      descricao: descricao,
      quantidade: Number(quantidade) || 1,
      valorTotal: valorTotalFmt || "R$ 0,00",
      valorNumerico: valorNum,
      pagoPor: pagoPor || "—",
      tipoGasto: tipoGasto || "Insumo Direto",
      observacoes: observacoes
    });

    resultado.resumo.totalGeral += valorNum;
    resultado.resumo.quantidadeLancamentos += 1;

    if (tipoGasto.toLowerCase().indexOf("espor") !== -1) {
      resultado.resumo.gastosEsporadicos += valorNum;
    } else {
      resultado.resumo.insumosDiretos += valorNum;
    }

    if (pagoPor.toLowerCase().indexOf("jo") !== -1) {
      resultado.resumo.pagoJoao += valorNum;
    } else if (pagoPor.toLowerCase().indexOf("natan") !== -1) {
      resultado.resumo.pagoNatan += valorNum;
    }
  }

  return resultado;
}

// ============================================================================
// 4. PARSER INTELIGENTE DA ABA "VISÃO GERAL"
// ============================================================================
function lerAbaVisaoGeral() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Visão Geral") || ss.getSheetByName("Visao Geral") || ss.getSheets()[0];
  var rows = sheet.getDataRange().getDisplayValues();

  var resultado = {
    fichaTecnica: {
      itens: [],
      custoTotalUnitario: "R$ 0,00",
      precoMedioVenda: "R$ 0,00",
      lucroBrutoUnitario: "R$ 0,00",
      margemBrutaUnitaria: "0,0%"
    },
    indicadores: {
      receitaBruta: "R$ 0,00",
      receitaSub: "",
      despesasTotais: "R$ 0,00",
      despesasSub: "",
      lucroLiquido: "R$ 0,00",
      lucroSub: "",
      margemOperacional: "0,0%",
      margemSub: ""
    },
    divisaoSocios: [],
    resolucaoAcerto: "",
    saidas: {
      insumosDiretos: "R$ 0,00",
      gastosEsporadicos: "R$ 0,00",
      totalSaidas: "R$ 0,00"
    }
  };

  var secaoAtual = "";

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var colA = String(row[0] || "").trim();
    var colALower = colA.toLowerCase();

    // Identifica mudança de seção
    if (colALower.indexOf("ficha técnica") !== -1) {
      secaoAtual = "ficha";
      continue;
    }
    if (colALower.indexOf("painel de indicadores") !== -1) {
      secaoAtual = "indicadores";
      continue;
    }
    if (colALower.indexOf("divisão de gastos") !== -1) {
      secaoAtual = "divisao";
      continue;
    }

    // --- SEÇÃO 1: FICHA TÉCNICA ---
    if (secaoAtual === "ficha") {
      if (!colA || colALower.indexOf("componente do custo") !== -1) continue;

      if (colALower.indexOf("custo total de produção") !== -1) {
        resultado.fichaTecnica.custoTotalUnitario = row[4] || "R$ 0,00";
      } else if (colALower.indexOf("preço médio de venda") !== -1) {
        resultado.fichaTecnica.precoMedioVenda = row[4] || "R$ 0,00";
      } else if (colALower.indexOf("lucro bruto unitário") !== -1) {
        resultado.fichaTecnica.lucroBrutoUnitario = row[4] || "R$ 0,00";
        resultado.fichaTecnica.margemBrutaUnitaria = row[5] || "0,0%";
      } else if (row[4]) {
        resultado.fichaTecnica.itens.push({
          componente: colA,
          detalhamento: row[1] || "",
          custoBase: row[2] || "-",
          rendimento: row[3] || "-",
          custoUnitario: row[4] || "R$ 0,00",
          percentual: row[5] || "0%"
        });
      }
    }

    // --- SEÇÃO 2: PAINEL DE INDICADORES GERAIS ---
    if (colALower.indexOf("receita total bruta") !== -1 && r + 2 < rows.length) {
      var linhaTitulos = rows[r];
      var linhaValores = rows[r + 1];
      var linhaSubs = rows[r + 2];

      // Mapeia as colunas preenchidas (suporta células mescladas como C:D e E:F)
      var cols = [];
      for (var c = 0; c < linhaTitulos.length; c++) {
        if (String(linhaTitulos[c] || "").trim() !== "") {
          cols.push(c);
        }
      }

      if (cols.length >= 4) {
        resultado.indicadores.receitaBruta = linhaValores[cols[0]] || "R$ 0,00";
        resultado.indicadores.receitaSub = linhaSubs[cols[0]] || "";

        resultado.indicadores.despesasTotais = linhaValores[cols[1]] || "R$ 0,00";
        resultado.indicadores.despesasSub = linhaSubs[cols[1]] || "";

        resultado.indicadores.lucroLiquido = linhaValores[cols[2]] || "R$ 0,00";
        resultado.indicadores.lucroSub = linhaSubs[cols[2]] || "";

        resultado.indicadores.margemOperacional = linhaValores[cols[3]] || "0,0%";
        resultado.indicadores.margemSub = linhaSubs[cols[3]] || "";
      }
      r += 2;
      continue;
    }

    // --- SEÇÃO 3: DIVISÃO 50/50 E ACERTO DE CONTAS ---
    if (secaoAtual === "divisao") {
      if (
        colA.indexOf("(+)") === 0 ||
        colA.indexOf("(-)") === 0 ||
        colA.indexOf("(=)") === 0
      ) {
        resultado.divisaoSocios.push({
          metrica: colA,
          joao: row[1] || "R$ 0,00",
          natan: row[2] || "R$ 0,00",
          total: row[3] || "R$ 0,00",
          regra: row[4] || "",
          observacao: row[5] || ""
        });
      } else if (colALower.indexOf("resolução final do acerto") !== -1) {
        for (var k = 1; k < row.length; k++) {
          if (String(row[k] || "").trim() !== "") {
            resultado.resolucaoAcerto = String(row[k]).trim();
            break;
          }
        }
      } else if (colALower.indexOf("detalhamento de saídas") !== -1) {
        resultado.saidas.insumosDiretos = row[2] || "R$ 0,00";
        resultado.saidas.gastosEsporadicos = row[4] || "R$ 0,00";
        resultado.saidas.totalSaidas = row[5] || "R$ 0,00";
      }
    }
  }

  return resultado;
}

