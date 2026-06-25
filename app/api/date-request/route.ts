import { NextResponse } from 'next/server';

type DateRequestBody = {
  answer?: string;
  date?: string;
  time?: string;
  food?: string;
  foodLabel?: string;
  note?: string;
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(date?: string) {
  if (!date) return 'не выбрана';

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(parsed);
}

export async function POST(request: Request) {
  let body: DateRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Некорректный JSON' }, { status: 400 });
  }

  if (!body.date || !body.time || !body.foodLabel) {
    return NextResponse.json(
      { ok: false, error: 'Нужны дата, время и выбор еды' },
      { status: 400 }
    );
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const owner = process.env.INVITE_OWNER_NAME ?? 'романтик';

  const text = [
    '💌 <b>Новая заявка на свидание</b>',
    '',
    `Ответ: <b>${escapeHtml(body.answer || 'Да')}</b>`,
    `Дата: <b>${escapeHtml(formatDate(body.date))}</b>`,
    `Время: <b>${escapeHtml(body.time)}</b>`,
    `Еда: <b>${escapeHtml(body.foodLabel)}</b>`,
    body.note ? `Комментарий: <b>${escapeHtml(body.note)}</b>` : '',
    '',
    `Отправлено для: ${escapeHtml(owner)} ❤️`
  ]
    .filter(Boolean)
    .join('\n');

  if (!botToken || !chatId) {
    return NextResponse.json({
      ok: true,
      delivered: false,
      warning: 'Telegram не настроен: добавь TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в .env.local или Vercel Environment Variables.'
    });
  }

  const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });

  if (!telegramResponse.ok) {
    const details = await telegramResponse.text();
    return NextResponse.json(
      { ok: false, error: 'Telegram не принял сообщение', details },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, delivered: true });
}
