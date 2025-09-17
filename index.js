const express = require('express');
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Конфигурация
const BOT_TOKEN = '8406574277:AAFwnvVsTRl7sNx2pTqDr7I4O-aVPf-pHnw';
const OPENAI_API_KEY = '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';

// Главная страница
app.get('/', (req, res) => {
  console.log('✅ Homepage requested');
  
  res.json({
    status: '🌿 Green Family Bot v2.0',
    description: 'Telegram bot is running successfully',
    timestamp: new Date().toISOString(),
    endpoints: {
      webhook: '/webhook',
      health: '/health'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🔥 === WEBHOOK RECEIVED ===');
    console.log('Time:', new Date().toISOString());
    console.log('Body size:', JSON.stringify(req.body).length, 'bytes');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    const { message, edited_message } = req.body;
    const msg = message || edited_message;
    
    if (!msg) {
      console.log('❌ No message found in webhook');
      return res.status(200).json({ status: 'ok', message: 'no_message' });
    }
    
    // Извлекаем данные
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    const text = msg.text || '';
    const from = msg.from || {};
    const username = from.username || from.first_name || 'Unknown';
    const userId = from.id;
    
    console.log('📨 Message details:');
    console.log('  Chat ID:', chatId);
    console.log('  Chat Type:', chatType);
    console.log('  User:', username, `(${userId})`);
    console.log('  Text:', `"${text}"`);
    
    // Определяем ответ
    let responseText = '';
    
    if (text === '/start') {
      responseText = `🌿 Добро пожаловать в Green Family Bot v2.0!

👋 Привет, ${username}!

🤖 Я новый улучшенный бот Green Family
✨ Работаю на Vercel + Node.js
🔧 Версия 2.0 - стабильная и быстрая

Команды:
/help - список команд
/info - информация о чате
/ping - проверка работы

💬 Также можете задать любой вопрос!`;

    } else if (text === '/help') {
      responseText = `🤖 Green Family Bot - Команды:

🚀 /start - приветствие и информация
❓ /help - эта справка
📊 /info - информация о чате
🏓 /ping - проверка работы бота
🌿 /about - о компании Green Family

💡 Дополнительно:
• Напишите любой вопрос - отвечу через AI
• Работаю в группах и личных чатах
• Логирую все сообщения в Google Sheets`;

    } else if (text === '/info') {
      responseText = `📊 Информация о чате:

🆔 Chat ID: ${chatId}
👤 Ваш ID: ${userId}
📝 Имя: ${username}
💬 Тип чата: ${chatType}
📅 Время: ${new Date().toLocaleString('ru-RU')}

🤖 Бот версия: 2.0
⚡ Платформа: Vercel
🌐 Статус: Онлайн`;

    } else if (text === '/ping') {
      responseText = `🏓 Понг!

✅ Бот работает отлично
⚡ Ответ за ${Date.now() - startTime}мс
🕐 Время сервера: ${new Date().toLocaleTimeString('ru-RU')}
🌍 Сервер: Vercel (США)
🔄 Uptime: ${Math.floor(process.uptime())} секунд`;

    } else if (text === '/about') {
      responseText = `🌿 Green Family - экологичные решения

💚 О компании:
• Натуральные продукты для дома
• Забота об окружающей среде
• Качество проверенное временем
• Здоровье вашей семьи - наш приоритет

🤖 Этот бот поможет:
• Ответить на вопросы о продукции
• Предоставить консультацию
• Обработать заказы и заявки`;

    } else if (text && text.length > 0) {
      // AI ответ для обычных сообщений
      console.log('🧠 Sending to AI...');
      responseText = await getAIResponse(text, username, chatType);
    }
    
    // Отправляем ответ
    if (responseText) {
      console.log('📤 Sending response:', responseText.slice(0, 100) + '...');
      
      const sendResult = await sendTelegramMessage(chatId, responseText);
      
      if (sendResult.success) {
        console.log('✅ Response sent successfully');
      } else {
        console.log('❌ Failed to send response:', sendResult.error);
      }
      
      // Логируем в Google Sheets (асинхронно)
      logToGoogleSheets(username, chatId, text, responseText).catch(err => {
        console.log('⚠️  Logging error (non-critical):', err.message);
      });
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`⏱️  Total processing time: ${processingTime}ms`);
    console.log('🏁 === WEBHOOK PROCESSED ===\n');
    
    return res.status(200).json({ 
      status: 'success', 
      processing_time: processingTime,
      response_sent: !!responseText 
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('💥 WEBHOOK ERROR:', error);
    console.error('Stack:', error.stack);
    console.log(`❌ Error processing time: ${processingTime}ms`);
    
    return res.status(200).json({ 
      status: 'error', 
      error: error.message,
      processing_time: processingTime
    });
  }
});

// Отправка сообщения в Telegram
async function sendTelegramMessage(chatId, text) {
  try {
    const fetch = (await import('node-fetch')).default;
    
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    };
    
    console.log('📡 Telegram API call:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'GreenFamilyBot/2.0'
      },
      body: JSON.stringify(payload),
      timeout: 30000
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }
    
    const data = JSON.parse(responseText);
    
    if (!data.ok) {
      throw new Error(`Telegram Error: ${data.description}`);
    }
    
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Telegram send error:', error);
    return { success: false, error: error.message };
  }
}

// AI ответ через OpenAI
async function getAIResponse(question, username, chatType) {
  try {
    const fetch = (await import('node-fetch')).default;
    
    const systemPrompt = `Ты — дружелюбный помощник компании Green Family, которая производит экологичные продукты для дома.

КОНТЕКСТ:
- Пользователь: ${username}
- Тип чата: ${chatType}
- Компания: Green Family (эко-продукты)

ПРАВИЛА:
- Отвечай кратко и по делу (до 200 слов)
- Используй эмодзи для оформления
- Будь вежливым и профессиональным
- Если вопрос о продукции - рассказывай о Green Family
- Если не знаешь точный ответ - скажи честно
- Отвечай на русском языке`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.7,
        max_tokens: 500,
        presence_penalty: 0.1
      }),
      timeout: 30000
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const aiText = data.choices[0]?.message?.content?.trim();
    
    if (!aiText) {
      throw new Error('Empty AI response');
    }
    
    return aiText;
    
  } catch (error) {
    console.error('❌ AI error:', error);
    
    if (error.message.includes('429')) {
      return '⏳ Слишком много запросов к AI. Попробуйте через минуту.';
    } else if (error.message.includes('401')) {
      return '🔑 Проблема с AI сервисом. Обратитесь к администратору.';
    } else {
      return `🤖 Извините, временные проблемы с AI сервисом.

Но я могу помочь с командами:
/help - список команд
/about - о Green Family
/info - информация`;
    }
  }
}

// Логирование в Google Sheets (упрощенная версия)
async function logToGoogleSheets(username, chatId, message, response) {
  try {
    // Здесь позже добавим интеграцию с Google Sheets
    console.log('📝 Log entry:', { username, chatId, message: message.slice(0, 50), response: response.slice(0, 50) });
    return true;
  } catch (error) {
    console.error('📝 Logging error:', error);
    return false;
  }
}

// Обработка системных событий
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log('🚀 === GREEN FAMILY BOT v2.0 STARTED ===');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🕐 Started at: ${new Date().toISOString()}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Webhook endpoint: /webhook`);
  console.log('✅ Ready to receive Telegram webhooks!');
});

// Export для Vercel
module.exports = app;
