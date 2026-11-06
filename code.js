// URL que você copiou no passo 8 do Apps Script
const urlPlanilha = "https://script.google.com/macros/s/AKfycbxfEMwRPJ0fFrtiUUSmxlYR4MCuMarZ7Rl7Y5rDSA0XHMXCjoEw9P8jNX9hEQ9GzGtIew/exec";

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
const tabLogin = document.getElementById("tabLogin");
const tabSales = document.getElementById("tabSales");
const salesTabLockBadge = document.getElementById("salesTabLockBadge");

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
// NAVEGAÇÃO ENTRE ABAS (1ª ABA: LOGIN | 2ª ABA: VENDAS)
// ============================================================================
function alternarAba(abaDestino) {
  if (abaDestino === "tabSales" && !appState.vendedorLogado) {
    mostrarNotificacao("Digite a senha do vendedor para acessar Vendas", "error");
    sellerPasswordInput.focus();
    return;
  }

  const isSales = abaDestino === "tabSales";

  tabLogin.classList.toggle("active", !isSales);
  tabSales.classList.toggle("active", isSales);

  tabBtnLogin.classList.toggle("active", !isSales);
  tabBtnSales.classList.toggle("active", isSales);

  // Header mais compacto na tela de vendas para dar mais espaço aos controles
  brandHeader.classList.toggle("compact", isSales);
}

tabBtnLogin.addEventListener("click", () => alternarAba("tabLogin"));
tabBtnSales.addEventListener("click", () => alternarAba("tabSales"));

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

// Inicialização
atualizarInterfaceVendedor();
atualizarResumoVenda();