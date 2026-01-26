/**
 * Serviço de Notificações via WhatsApp
 * Integração sugerida: Evolution API ou Twilio
 */

const WHATSAPP_CONFIG_KEY = 'qtdapp_whatsapp_config';

export const getWhatsAppConfig = () => {
  const config = localStorage.getItem(WHATSAPP_CONFIG_KEY);
  return config ? JSON.parse(config) : { enabled: false, number: '', apiKey: '', instance: '' };
};

export const saveWhatsAppConfig = (config) => {
  localStorage.setItem(WHATSAPP_CONFIG_KEY, JSON.stringify(config));
};

export const sendWhatsAppAlert = async (itemName, currentQty, minQty) => {
  const config = getWhatsAppConfig();
  if (!config.enabled || !config.number || !config.apiUrl) return;

  const message = `⚠️ *QtdApp: Alerta de Estoque Crítico*\n\nO item *${itemName}* atingiu o nível mínimo.\n\n📉 Estoque Atual: *${currentQty}*\n🚩 Nível Mínimo: *${minQty}*\n\n_Favor providenciar a reposição._`;

  try {
    const response = await fetch(`${config.apiUrl}/message/sendText/${config.instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.apiKey
      },
      body: JSON.stringify({
        number: config.number,
        options: { delay: 1200, presence: "composing", linkPreview: false },
        textMessage: { text: message }
      })
    });
    
    if (!response.ok) throw new Error('Falha ao enviar mensagem via Evolution API');
    console.log(`%c[WhatsApp Alert] Enviado com sucesso para ${config.number}`, "color: #10b981; font-weight: bold;");
  } catch (error) {
    console.error("[WhatsApp Alert] Erro:", error);
  }
};

export const sendTestMessage = async () => {
  const config = getWhatsAppConfig();
  if (!config.enabled || !config.number || !config.apiUrl) {
    throw new Error("WhatsApp não configurado corretamente (Número, API URL ou Instância faltando).");
  }

  const message = `✅ *QtdApp: Teste de Conexão*\n\nParabéns! Suas notificações de estoque estão configuradas corretamente para este número.`;
  
  try {
    const response = await fetch(`${config.apiUrl}/message/sendText/${config.instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.apiKey
      },
      body: JSON.stringify({
        number: config.number,
        options: { delay: 1200, presence: "composing", linkPreview: false },
        textMessage: { text: message }
      })
    });
    
    if (!response.ok) throw new Error('Falha ao enviar mensagem de teste');
    return true;
  } catch (error) {
    console.error("[WhatsApp Test] Erro:", error);
    throw error;
  }
};
