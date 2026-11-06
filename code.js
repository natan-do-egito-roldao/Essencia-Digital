// URL que você copiou no passo 8 do Apps Script
const urlPlanilha = "https://script.google.com/macros/s/AKfycbwMOW4mPWzn2OfvJ9l43x85_ypna8T1elE3OwC4FlToPjU7cG7wYYOnK9IdvDVk2ao_jw/exec";

// ============================================================================
// CONFIGURAÇÃO DE SENHAS DOS VENDEDORES
// Altere aqui caso queira mudar a senha do Natan ou do João
// ============================================================================
const SENHAS_VENDEDORES = {
  "1234": "Natan",
  "4321": "João"
};

const PRECO_UNITARIO_SUGERIDO = 6.00;

// Estado da aplicação
const appState = {
  vendedorLogado: null, // "Natan" ou "João"
  itemSelecionado: "Chocolate com Leite Ninho",
  isProdutoAtivo: true,
  quantidade: 1,
  valorTotal: 6.00,
  formaPagamento: "Pix",
  enviando: false
};

// ============================================================================
// ELEMENTOS DO DOM
// ============================================================================
const brandHeader = document.getElementById("brandHeader");
const headerSellerPill = document.getElementById("headerSellerPill");
const headerSellerName = document.getElementById("headerSellerName");

const tabBtnLogin = document.getElementById("tabBtnLogin");
const tabBtnSales = document.getElementById("tabBtnSales");
const tabBtnFinance = document.getElementById("tabBtnFinance");
const tabLogin = document.getElementById("tabLogin");
const tabSales = document.getElementById("tabSales");
const tabFinance = document.getElementById("tabFinance");
const salesTabLockBadge = document.getElementById("salesTabLockBadge");
const financeTabLockBadge = document.getElementById("financeTabLockBadge");

// Login
const loginForm = document.getElementById("loginForm");
const loginFormCard = document.getElementById("loginFormCard");
const loggedSellerCard = document.getElementById("loggedSellerCard");
const sellerPasswordInput = document.getElementById("sellerPasswordInput");
const togglePassBtn = document.getElementById("togglePassBtn");
const loginErrorMsg = document.getElementById("loginErrorMsg");
const sellerAvatarInitial = document.getElementById("sellerAvatarInitial");
const loggedSellerName = document.getElementById("loggedSellerName");
const goToSalesBtn = document.getElementById("goToSalesBtn");
const goToFinanceBtn = document.getElementById("goToFinanceBtn");
const logoutSellerBtn = document.getElementById("logoutSellerBtn");

// Teclado PIN
const pinKeys = document.querySelectorAll(".pin-key[data-digit]");
const pinClearBtn = document.getElementById("pinClearBtn");
const pinBackBtn = document.getElementById("pinBackBtn");

// Vendas
const salesForm = document.getElementById("salesForm");
const productCard = document.getElementById("productCard");
const productStatusHint = document.getElementById("productStatusHint");
const saleDetailsBox = document.getElementById("saleDetailsBox");

const qtyMinusBtn = document.getElementById("qtyMinusBtn");
const qtyPlusBtn = document.getElementById("qtyPlusBtn");
const qtyInput = document.getElementById("qtyInput");
const qtyChips = document.querySelectorAll(".qty-chip");

const totalPriceInput = document.getElementById("totalPriceInput");
const priceChips = document.querySelectorAll(".price-chip");
const calculatedUnitPrice = document.getElementById("calculatedUnitPrice");

const paymentOptions = document.querySelectorAll(".payment-option");

const summarySeller = document.getElementById("summarySeller");
const summaryItem = document.getElementById("summaryItem");
const summaryPayment = document.getElementById("summaryPayment");
const summaryQtyLabel = document.getElementById("summaryQtyLabel");
const summaryTotalValue = document.getElementById("summaryTotalValue");
const submitSaleBtn = document.getElementById("submitSaleBtn");

// Toast iOS
const iosToast = document.getElementById("iosToast");
const toastIcon = document.getElementById("toastIcon");
const toastText = document.getElementById("toastText");
let toastTimeout = null;

// ============================================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================================
function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function mostrarNotificacao(mensagem, tipo = "success") {
  if (toastTimeout) clearTimeout(toastTimeout);

  toastText.textContent = mensagem;
  toastIcon.className = `toast-icon ${tipo}`;

  if (tipo === "success") {
    toastIcon.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>`;
  } else {
    toastIcon.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>`;
  }

  iosToast.classList.add("show");
  toastTimeout = setTimeout(() => {
    iosToast.classList.remove("show");
  }, 3200);
}

// ============================================================================
// NAVEGAÇÃO ENTRE ABAS (1ª ABA: LOGIN | 2ª ABA: VENDAS | 3ª ABA: GESTÃO)
// ============================================================================
function alternarAba(abaDestino) {
  if ((abaDestino === "tabSales" || abaDestino === "tabFinance") && !appState.vendedorLogado) {
    mostrarNotificacao("Digite a senha do vendedor para acessar o painel", "error");
    sellerPasswordInput.focus();
    return;
  }

  tabLogin.classList.toggle("active", abaDestino === "tabLogin");
  tabSales.classList.toggle("active", abaDestino === "tabSales");
  tabFinance.classList.toggle("active", abaDestino === "tabFinance");

  tabBtnLogin.classList.toggle("active", abaDestino === "tabLogin");
  tabBtnSales.classList.toggle("active", abaDestino === "tabSales");
  tabBtnFinance.classList.toggle("active", abaDestino === "tabFinance");

  // Header mais compacto nas telas de Vendas e Gestão
  brandHeader.classList.toggle("compact", abaDestino !== "tabLogin");

  if (abaDestino === "tabFinance") {
    carregarDadosGestao(false);
  }
}

tabBtnLogin.addEventListener("click", () => alternarAba("tabLogin"));
tabBtnSales.addEventListener("click", () => alternarAba("tabSales"));
tabBtnFinance.addEventListener("click", () => alternarAba("tabFinance"));

// ============================================================================
// LÓGICA DE LOGIN (APENAS SENHA -> IDENTIFICA NATAN OU JOÃO)
// ============================================================================
function autenticarComSenha(senhaDigitada) {
  const senhaLimpa = String(senhaDigitada).trim();
  const vendedor = SENHAS_VENDEDORES[senhaLimpa];

  if (!vendedor) {
    loginErrorMsg.textContent = "Senha inválida. Tente novamente.";
    sellerPasswordInput.select();
    return false;
  }

  // Sucesso no login
  appState.vendedorLogado = vendedor;
  loginErrorMsg.textContent = "";
  sellerPasswordInput.value = "";

  atualizarInterfaceVendedor();
  atualizarResumoVenda();

  mostrarNotificacao(`Bem-vindo, ${vendedor}!`);
  alternarAba("tabSales");
  return true;
}

function atualizarInterfaceVendedor() {
  const logado = Boolean(appState.vendedorLogado);

  loginFormCard.classList.toggle("hidden", logado);
  loggedSellerCard.classList.toggle("hidden", !logado);
  headerSellerPill.classList.toggle("hidden", !logado);
  salesTabLockBadge.classList.toggle("hidden", logado);
  if (financeTabLockBadge) {
    financeTabLockBadge.classList.toggle("hidden", logado);
  }

  if (logado) {
    headerSellerName.textContent = appState.vendedorLogado;
    loggedSellerName.textContent = appState.vendedorLogado;
    sellerAvatarInitial.textContent = appState.vendedorLogado.charAt(0).toUpperCase();
    summarySeller.textContent = appState.vendedorLogado;
  }
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  autenticarComSenha(sellerPasswordInput.value);
});

// Teclado numérico rápido estilo iPhone
pinKeys.forEach((btn) => {
  btn.addEventListener("click", () => {
    loginErrorMsg.textContent = "";
    if (sellerPasswordInput.value.length < 12) {
      sellerPasswordInput.value += btn.dataset.digit;
      // Se a senha digitada já bater com um vendedor, entra automaticamente
      if (SENHAS_VENDEDORES[sellerPasswordInput.value]) {
        setTimeout(() => autenticarComSenha(sellerPasswordInput.value), 120);
      }
    }
  });
});

pinClearBtn.addEventListener("click", () => {
  sellerPasswordInput.value = "";
  loginErrorMsg.textContent = "";
});

pinBackBtn.addEventListener("click", () => {
  sellerPasswordInput.value = sellerPasswordInput.value.slice(0, -1);
  loginErrorMsg.textContent = "";
});

togglePassBtn.addEventListener("click", () => {
  const isPass = sellerPasswordInput.type === "password";
  sellerPasswordInput.type = isPass ? "text" : "password";
});

goToSalesBtn.addEventListener("click", () => alternarAba("tabSales"));
if (goToFinanceBtn) {
  goToFinanceBtn.addEventListener("click", () => alternarAba("tabFinance"));
}

logoutSellerBtn.addEventListener("click", () => {
  appState.vendedorLogado = null;
  atualizarInterfaceVendedor();
  alternarAba("tabLogin");
  mostrarNotificacao("Sessão encerrada");
});

// ============================================================================
// LÓGICA DA ABA DE VENDAS (DOCE, QUANTIDADE, VALOR E PAGAMENTO)
// ============================================================================

// 1. Seleção do Doce (Palha Italiana de Chocolate com Leite Ninho)
productCard.addEventListener("click", () => {
  appState.isProdutoAtivo = !appState.isProdutoAtivo;
  productCard.classList.toggle("selected", appState.isProdutoAtivo);
  productCard.setAttribute("aria-pressed", String(appState.isProdutoAtivo));
  saleDetailsBox.classList.toggle("disabled-section", !appState.isProdutoAtivo);
  productStatusHint.textContent = appState.isProdutoAtivo
    ? "Selecionado"
    : "Toque para selecionar";
});

// 2. Controle de Quantidade
function definirQuantidade(novaQtd, atualizarValorSugerido = true) {
  const qtd = Math.max(1, Math.min(999, parseInt(novaQtd, 10) || 1));
  appState.quantidade = qtd;
  qtyInput.value = qtd;

  qtyChips.forEach((chip) => {
    chip.classList.toggle("active", parseInt(chip.dataset.qty, 10) === qtd);
  });

  if (atualizarValorSugerido) {
    const sugerido = (qtd * PRECO_UNITARIO_SUGERIDO).toFixed(2);
    totalPriceInput.value = sugerido;
    appState.valorTotal = parseFloat(sugerido);

    priceChips.forEach((chip) => {
      chip.classList.toggle("active", parseFloat(chip.dataset.price) === appState.valorTotal);
    });
  }

  atualizarResumoVenda();
}

qtyMinusBtn.addEventListener("click", () => {
  definirQuantidade(appState.quantidade - 1, true);
});

qtyPlusBtn.addEventListener("click", () => {
  definirQuantidade(appState.quantidade + 1, true);
});

qtyInput.addEventListener("input", () => {
  const val = parseInt(qtyInput.value, 10);
  if (val > 0) {
    appState.quantidade = val;
    qtyChips.forEach((chip) => {
      chip.classList.toggle("active", parseInt(chip.dataset.qty, 10) === val);
    });
    atualizarResumoVenda();
  }
});

qtyChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    definirQuantidade(parseInt(chip.dataset.qty, 10), true);
  });
});

// 3. Controle do Valor Total Vendido (calcula o preço unitário automaticamente)
totalPriceInput.addEventListener("input", () => {
  const valor = parseFloat(totalPriceInput.value);
  appState.valorTotal = isNaN(valor) || valor < 0 ? 0 : valor;

  priceChips.forEach((chip) => {
    chip.classList.toggle("active", parseFloat(chip.dataset.price) === appState.valorTotal);
  });

  atualizarResumoVenda();
});

priceChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const preco = parseFloat(chip.dataset.price);
    appState.valorTotal = preco;
    totalPriceInput.value = preco.toFixed(2);

    priceChips.forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");

    atualizarResumoVenda();
  });
});

// 4. Seleção da Forma de Pagamento
paymentOptions.forEach((option) => {
  option.addEventListener("click", () => {
    paymentOptions.forEach((opt) => {
      opt.classList.remove("selected");
      opt.setAttribute("aria-checked", "false");
    });
    option.classList.add("selected");
    option.setAttribute("aria-checked", "true");

    appState.formaPagamento = option.dataset.payment;
    atualizarResumoVenda();
  });
});

// Atualiza o painel de cálculo de preço unitário e resumo
function atualizarResumoVenda() {
  const qtd = Math.max(1, appState.quantidade);
  const total = Math.max(0, appState.valorTotal);
  const precoUnitario = total / qtd;

  calculatedUnitPrice.textContent = `${formatarMoeda(precoUnitario)} / un.`;
  summarySeller.textContent = appState.vendedorLogado || "—";
  summaryItem.textContent = "Palha Italiana (Choc. c/ Ninho)";
  summaryPayment.textContent = appState.formaPagamento;
  summaryQtyLabel.textContent = `Total (${qtd} ${qtd === 1 ? "unidade" : "unidades"})`;
  summaryTotalValue.textContent = formatarMoeda(total);
}

// ============================================================================
// ENVIO DOS DADOS PARA O GOOGLE SHEETS
// ============================================================================
salesForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (appState.enviando) return;

  if (!appState.vendedorLogado) {
    mostrarNotificacao("Faça login com sua senha primeiro!", "error");
    alternarAba("tabLogin");
    return;
  }

  if (!appState.isProdutoAtivo) {
    mostrarNotificacao("Selecione o doce antes de registrar a venda", "error");
    return;
  }

  const quantidade = Math.max(1, parseInt(qtyInput.value, 10) || 1);
  const valorTotal = parseFloat(totalPriceInput.value);

  if (isNaN(valorTotal) || valorTotal <= 0) {
    mostrarNotificacao("Informe por quanto foi vendido", "error");
    totalPriceInput.focus();
    return;
  }

  const precoUnitario = Number((valorTotal / quantidade).toFixed(2));

  // Dados capturados do seu formulário no web app
  const dadosDaVenda = {
    item: appState.itemSelecionado, // "Palha Italiana de Chocolate com Leite Ninho"
    quantidade: quantidade,
    precoUnitario: precoUnitario,
    valorTotal: Number(valorTotal.toFixed(2)),
    formaPagamento: appState.formaPagamento,
    vendedor: appState.vendedorLogado // "Natan" ou "João"
  };

  // Estado visual de carregamento no botão
  appState.enviando = true;
  submitSaleBtn.disabled = true;
  const conteudoOriginalBtn = submitSaleBtn.innerHTML;
  submitSaleBtn.innerHTML = `<div class="spinner"></div><span>Salvando na planilha...</span>`;

  // Enviando para o Google Sheets
  fetch(urlPlanilha, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(dadosDaVenda)
  })
    .then(async (response) => {
      const texto = await response.text();
      let data;
      try {
        data = JSON.parse(texto);
      } catch {
        throw new Error(
          "O Google Apps Script não retornou JSON válido. Verifique se doPost(e) está fora de myFunction() e se a implantação está liberada para 'Qualquer pessoa'."
        );
      }
      if (data.status && data.status !== "sucesso" && data.status !== "ok") {
        throw new Error(data.mensagem || "Erro retornado pela planilha.");
      }
      return data;
    })
    .then((data) => {
      console.log("Venda registrada com sucesso:", data);
      const detalheLocal =
        data && data.aba && data.linha ? ` (${data.aba}, linha ${data.linha})` : "";
      mostrarNotificacao(
        `Venda de ${formatarMoeda(valorTotal)} salva${detalheLocal}!`,
        "success"
      );

      // Reseta para 1 unidade mantendo o vendedor logado para a próxima venda
      definirQuantidade(1, true);

      // Se o Apps Script já devolveu os dados atualizados de gestão ou para atualizar em background
      if (data && data.gestao) {
        renderizarPainelGestao(data.gestao);
      } else {
        carregarDadosGestao(false);
      }
    })
    .catch((error) => {
      console.error("Erro ao salvar:", error);
      mostrarNotificacao(
        error.message || "Erro ao conectar com a planilha. Verifique o Apps Script.",
        "error"
      );
    })
    .finally(() => {
      appState.enviando = false;
      submitSaleBtn.disabled = false;
      submitSaleBtn.innerHTML = conteudoOriginalBtn;
    });
});

// ============================================================================
// ABA 3: GESTÃO FINANCEIRA & PRECIFICAÇÃO (LEITURA DA ABA "VISÃO GERAL")
// ============================================================================
const refreshFinanceBtn = document.getElementById("refreshFinanceBtn");
const syncBtnLabel = document.getElementById("syncBtnLabel");
const financeSyncDot = document.getElementById("financeSyncDot");
const financeLastSyncText = document.getElementById("financeLastSyncText");

// Estado base inicial (espelhado da aba "Visão Geral" da planilha)
const DADOS_FINANCEIROS_PADRAO = {
  fichaTecnica: {
    itens: [
      {
        componente: "Ingredientes da Receita Base",
        detalhamento: "Leite cond., biscoito maisena, cacau 50%, manteiga",
        custoBase: "R$ 32,50",
        rendimento: "25",
        custoUnitario: "R$ 1,30",
        percentual: "67,4%"
      },
      {
        componente: "Embalagem Individual",
        detalhamento: "Saquinho celofane 10x15 + fitilho",
        custoBase: "R$ 18,00",
        rendimento: "100",
        custoUnitario: "R$ 0,18",
        percentual: "9,3%"
      },
      {
        componente: "Adesivo / Tag da Marca",
        detalhamento: "Adesivo redondo personalizado com logo",
        custoBase: "R$ 25,00",
        rendimento: "100",
        custoUnitario: "R$ 0,25",
        percentual: "13,0%"
      },
      {
        componente: "Custos Indiretos (Gás / Energia)",
        detalhamento: "Estimativa proporcional por receita/lote",
        custoBase: "R$ 5,00",
        rendimento: "25",
        custoUnitario: "R$ 0,20",
        percentual: "10,4%"
      }
    ],
    custoTotalUnitario: "R$ 1,93",
    precoMedioVenda: "R$ 10,00",
    lucroBrutoUnitario: "R$ 8,07",
    margemBrutaUnitaria: "80,7%"
  },
  indicadores: {
    receitaBruta: "R$ 46,00",
    receitaSub: "Total: 7 palhas vendidas",
    despesasTotais: "R$ 338,50",
    despesasSub: "Gastos Esporádicos: R$ 62,00",
    lucroLiquido: "-R$ 292,50",
    lucroSub: "Divisão igualitária (50% cada)",
    margemOperacional: "-635,9%",
    margemSub: "Prejuízo"
  },
  divisaoSocios: [
    {
      metrica: "(+) Receitas Recebidas (Em Mãos/Conta)",
      joao: "R$ 0,00",
      natan: "R$ 46,00",
      total: "R$ 46,00",
      regra: "50% para cada",
      observacao: "Dinheiro arrecadado por sócio"
    },
    {
      metrica: "(-) Despesas Pagas do Próprio Bolso",
      joao: "R$ 233,50",
      natan: "R$ 105,00",
      total: "R$ 338,50",
      regra: "50% para cada",
      observacao: "Gastos adiantados por sócio"
    },
    {
      metrica: "(=) Parcela Justa das Despesas (50%)",
      joao: "R$ 169,25",
      natan: "R$ 169,25",
      total: "R$ 338,50",
      regra: "50% / 50%",
      observacao: "Custo de responsabilidade de cada sócio"
    },
    {
      metrica: "(=) Lucro Líquido a Receber (50%)",
      joao: "-R$ 146,25",
      natan: "-R$ 146,25",
      total: "-R$ 292,50",
      regra: "50% / 50%",
      observacao: "Metade do lucro total realizado"
    },
    {
      metrica: "(=) Saldo Líquido de Compensação",
      joao: "R$ 87,25",
      natan: "-R$ 87,25",
      total: "R$ 0,00",
      regra: "Equilíbrio (R$ 0,00)",
      observacao: "Posição final de acerto"
    }
  ],
  resolucaoAcerto: "👉 NATAN deve transferir via Pix para JOÃO o valor de R$ 87,25",
  saidas: {
    insumosDiretos: "R$ 276,50",
    gastosEsporadicos: "R$ 62,00",
    totalSaidas: "R$ 338,50"
  }
};

function ehValorNegativo(textoValor) {
  return String(textoValor || "").trim().includes("-");
}

function classeCorValor(textoValor, colorirPositivo = false) {
  const str = String(textoValor || "").trim();
  if (str.includes("-")) return "text-neg";
  if (colorirPositivo && str !== "R$ 0,00" && str !== "0,0%" && str !== "-") return "text-pos";
  return "";
}

function renderizarPainelGestao(dados) {
  if (!dados) return;

  const ft = dados.fichaTecnica || DADOS_FINANCEIROS_PADRAO.fichaTecnica;
  const ind = dados.indicadores || DADOS_FINANCEIROS_PADRAO.indicadores;
  const div =
    Array.isArray(dados.divisaoSocios) && dados.divisaoSocios.length > 0
      ? dados.divisaoSocios
      : DADOS_FINANCEIROS_PADRAO.divisaoSocios;
  const saidas = dados.saidas || DADOS_FINANCEIROS_PADRAO.saidas;
  const resolucao = dados.resolucaoAcerto || DADOS_FINANCEIROS_PADRAO.resolucaoAcerto;

  // 1. Hero Resolução Final do Acerto
  const finResolucaoTexto = document.getElementById("finResolucaoTexto");
  const finHeroSaldoJoao = document.getElementById("finHeroSaldoJoao");
  const finHeroSaldoNatan = document.getElementById("finHeroSaldoNatan");
  const finEquilibrioTag = document.getElementById("finEquilibrioTag");

  if (finResolucaoTexto) finResolucaoTexto.textContent = resolucao;

  const linhaSaldo = div.find((d) =>
    String(d.metrica).toLowerCase().includes("saldo líquido")
  );
  if (linhaSaldo) {
    if (finHeroSaldoJoao) {
      finHeroSaldoJoao.textContent = linhaSaldo.joao;
      finHeroSaldoJoao.className = `partner-pill-val ${
        ehValorNegativo(linhaSaldo.joao) ? "val-negative" : "val-positive"
      }`;
    }
    if (finHeroSaldoNatan) {
      finHeroSaldoNatan.textContent = linhaSaldo.natan;
      finHeroSaldoNatan.className = `partner-pill-val ${
        ehValorNegativo(linhaSaldo.natan) ? "val-negative" : "val-positive"
      }`;
    }
    if (finEquilibrioTag && linhaSaldo.regra) {
      finEquilibrioTag.textContent = linhaSaldo.regra;
    }
  }

  // 2. Indicadores Gerais do Negócio (Bento Grid)
  const kpiReceitaValor = document.getElementById("kpiReceitaValor");
  const kpiReceitaSub = document.getElementById("kpiReceitaSub");
  const kpiDespesasValor = document.getElementById("kpiDespesasValor");
  const kpiDespesasSub = document.getElementById("kpiDespesasSub");
  const kpiLucroBox = document.getElementById("kpiLucroBox");
  const kpiLucroValor = document.getElementById("kpiLucroValor");
  const kpiLucroSub = document.getElementById("kpiLucroSub");
  const kpiMargemBox = document.getElementById("kpiMargemBox");
  const kpiMargemValor = document.getElementById("kpiMargemValor");
  const kpiMargemSub = document.getElementById("kpiMargemSub");

  if (kpiReceitaValor) kpiReceitaValor.textContent = ind.receitaBruta;
  if (kpiReceitaSub) kpiReceitaSub.textContent = ind.receitaSub;
  if (kpiDespesasValor) kpiDespesasValor.textContent = ind.despesasTotais;
  if (kpiDespesasSub) kpiDespesasSub.textContent = ind.despesasSub;

  if (kpiLucroValor) kpiLucroValor.textContent = ind.lucroLiquido;
  if (kpiLucroSub) kpiLucroSub.textContent = ind.lucroSub;
  if (kpiLucroBox) {
    const isNeg = ehValorNegativo(ind.lucroLiquido);
    kpiLucroBox.className = `kpi-bento-item ${
      isNeg ? "kpi-status-negative" : "kpi-status-positive"
    }`;
  }

  if (kpiMargemValor) kpiMargemValor.textContent = ind.margemOperacional;
  if (kpiMargemSub) kpiMargemSub.textContent = ind.margemSub;
  if (kpiMargemBox) {
    const isNegMargem = ehValorNegativo(ind.margemOperacional);
    kpiMargemBox.className = `kpi-bento-item ${
      isNegMargem ? "kpi-status-negative" : "kpi-status-positive"
    }`;
  }

  // Detalhamento de Saídas
  const finInsumosDiretos = document.getElementById("finInsumosDiretos");
  const finGastosEsporadicos = document.getElementById("finGastosEsporadicos");
  const finTotalSaidas = document.getElementById("finTotalSaidas");

  if (finInsumosDiretos) finInsumosDiretos.textContent = saidas.insumosDiretos;
  if (finGastosEsporadicos) finGastosEsporadicos.textContent = saidas.gastosEsporadicos;
  if (finTotalSaidas) finTotalSaidas.textContent = saidas.totalSaidas;

  // 3. Divisão de Gastos, Lucros e Acerto de Contas (50% João / 50% Natan)
  const partnerDivisionList = document.getElementById("partnerDivisionList");
  if (partnerDivisionList) {
    partnerDivisionList.innerHTML = div
      .map((item) => {
        const lower = String(item.metrica || "").toLowerCase();
        const isLucroOuSaldo =
          lower.includes("lucro líquido") || lower.includes("saldo líquido");
        const extraCardClass = lower.includes("saldo líquido")
          ? "highlight-settlement"
          : "";

        return `
          <div class="partner-metric-card ${extraCardClass}">
            <div class="partner-metric-top">
              <div>
                <div class="partner-metric-title">${item.metrica}</div>
                <div class="partner-metric-obs">${item.observacao || ""}</div>
              </div>
              <span class="partner-rule-pill">${item.regra || "50% / 50%"}</span>
            </div>
            <div class="partner-values-grid">
              <div class="partner-val-col">
                <span>João</span>
                <strong class="${classeCorValor(item.joao, isLucroOuSaldo)}">${item.joao}</strong>
              </div>
              <div class="partner-val-col">
                <span>Natan</span>
                <strong class="${classeCorValor(item.natan, isLucroOuSaldo)}">${item.natan}</strong>
              </div>
              <div class="partner-val-col">
                <span>Total</span>
                <strong class="${classeCorValor(item.total, isLucroOuSaldo)}">${item.total}</strong>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // 4. Ficha Técnica & Custo Unitário por Palha
  const ftCustoUnitarioTotal = document.getElementById("ftCustoUnitarioTotal");
  const ftPrecoMedioVenda = document.getElementById("ftPrecoMedioVenda");
  const ftLucroBrutoUnitario = document.getElementById("ftLucroBrutoUnitario");
  const ftMargemBrutaPct = document.getElementById("ftMargemBrutaPct");
  const costCompositionBar = document.getElementById("costCompositionBar");
  const techSheetItemsList = document.getElementById("techSheetItemsList");

  if (ftCustoUnitarioTotal) ftCustoUnitarioTotal.textContent = ft.custoTotalUnitario;
  if (ftPrecoMedioVenda) ftPrecoMedioVenda.textContent = ft.precoMedioVenda;
  if (ftLucroBrutoUnitario) ftLucroBrutoUnitario.textContent = ft.lucroBrutoUnitario;
  if (ftMargemBrutaPct) ftMargemBrutaPct.textContent = `Margem ${ft.margemBrutaUnitaria}`;

  const coresGrafico = ["#5A200D", "#D4A373", "#943E21", "#C08552"];
  const itensFicha = Array.isArray(ft.itens) ? ft.itens : DADOS_FINANCEIROS_PADRAO.fichaTecnica.itens;

  if (costCompositionBar) {
    costCompositionBar.innerHTML = itensFicha
      .map((item, idx) => {
        const pctNum =
          parseFloat(String(item.percentual).replace("%", "").replace(",", ".")) || 0;
        const cor = coresGrafico[idx % coresGrafico.length];
        return `<div class="cost-bar-segment" style="width: ${pctNum}%; background-color: ${cor};" title="${item.componente}: ${item.percentual}"></div>`;
      })
      .join("");
  }

  if (techSheetItemsList) {
    techSheetItemsList.innerHTML = itensFicha
      .map((item, idx) => {
        const cor = coresGrafico[idx % coresGrafico.length];
        return `
          <div class="tech-item-card">
            <div class="tech-item-top">
              <div class="tech-item-title-wrap">
                <span class="tech-color-dot" style="background-color: ${cor};"></span>
                <div>
                  <div class="tech-item-name">${item.componente}</div>
                  <div class="tech-item-desc">${item.detalhamento}</div>
                </div>
              </div>
              <div class="tech-item-unit-badge">
                <span class="tech-item-unit-cost">${item.custoUnitario} / un.</span>
                <span class="tech-item-pct">${item.percentual} do custo</span>
              </div>
            </div>
            <div class="tech-item-meta">
              <span>Custo Base: <strong>${item.custoBase}</strong></span>
              <span>Rendimento: <strong>${item.rendimento} unid.</strong></span>
            </div>
          </div>
        `;
      })
      .join("");
  }
}

let carregandoGestao = false;

function carregarDadosGestao(exibirToast = true) {
  if (carregandoGestao) return;
  carregandoGestao = true;

  if (refreshFinanceBtn) refreshFinanceBtn.classList.add("loading");
  if (syncBtnLabel) syncBtnLabel.textContent = "Sincronizando...";
  if (financeSyncDot) financeSyncDot.classList.add("syncing");
  if (financeLastSyncText) {
    financeLastSyncText.textContent = 'Lendo aba "Visão Geral" da planilha...';
  }

  fetch(`${urlPlanilha}?acao=gestao&t=${Date.now()}`)
    .then(async (res) => {
      const texto = await res.text();
      return JSON.parse(texto);
    })
    .then((data) => {
      const payloadGestao = data && data.gestao ? data.gestao : data;
      if (payloadGestao && (payloadGestao.indicadores || payloadGestao.fichaTecnica)) {
        renderizarPainelGestao(payloadGestao);
        const hora = new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        });
        if (financeLastSyncText) {
          financeLastSyncText.textContent = `Sincronizado com "Visão Geral" às ${hora}`;
        }
        if (exibirToast) {
          mostrarNotificacao("Painel financeiro atualizado com a planilha!", "success");
        }
      } else {
        throw new Error("A planilha ainda não retornou os dados da aba Visão Geral.");
      }
    })
    .catch((err) => {
      console.warn("Usando snapshot local da Visão Geral:", err.message);
      if (financeLastSyncText) {
        financeLastSyncText.textContent =
          'Exibindo dados da "Visão Geral" (atualize o Apps Script para sincronia ao vivo)';
      }
      if (exibirToast) {
        mostrarNotificacao(
          "Atualize o código no Apps Script (Nova versão) para sincronizar ao vivo",
          "error"
        );
      }
    })
    .finally(() => {
      carregandoGestao = false;
      if (refreshFinanceBtn) refreshFinanceBtn.classList.remove("loading");
      if (syncBtnLabel) syncBtnLabel.textContent = "Atualizar";
      if (financeSyncDot) financeSyncDot.classList.remove("syncing");
    });
}

if (refreshFinanceBtn) {
  refreshFinanceBtn.addEventListener("click", () => carregarDadosGestao(true));
}

// Inicialização
atualizarInterfaceVendedor();
atualizarResumoVenda();
renderizarPainelGestao(DADOS_FINANCEIROS_PADRAO);