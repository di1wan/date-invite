'use client';

import { type CSSProperties, useMemo, useState } from 'react';

type Stage = 'ask' | 'confirm' | 'plan' | 'food' | 'final';
type SubmitState = 'idle' | 'loading' | 'sent' | 'saved' | 'error';

type FoodOption = {
  id: string;
  emoji: string;
  label: string;
  caption: string;
};

const foodOptions: FoodOption[] = [
  { id: 'pasta', emoji: '🍝', label: 'Паста', caption: '' },
  { id: 'sushi', emoji: '🍣', label: 'Суши', caption: '' },
  { id: 'pizza', emoji: '🍕', label: 'Пицца', caption: '' },
  { id: 'ramen', emoji: '🍜', label: 'Рамен', caption: '' },
  { id: 'burger', emoji: '🍔', label: 'Бургеры', caption: '' },
  { id: 'dessert', emoji: '🍰', label: 'Десерт', caption: '' }
];

const noMessages = [
  'Кнопка «нет» немного стесняется 😳',
  'Не получится, судьба уже всё решила 💘',
  'Она убежала, попробуй «Да»',
  'Ну пожалуйста-а-а 🥺',
  'Эта кнопка работает только в теории'
];

function getTodayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  if (!value) return 'дату';

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(parsed);
}

function heartStyle(index: number): CSSProperties {
  return {
    '--delay': `${index * -0.65}s`,
    '--left': `${(index * 17 + 9) % 96}%`,
    '--size': `${12 + (index % 6) * 4}px`,
    '--duration': `${10 + (index % 7)}s`
  } as CSSProperties;
}

export default function Home() {
  const today = useMemo(() => getTodayInputValue(), []);
  const [stage, setStage] = useState<Stage>('ask');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [foodId, setFoodId] = useState('');
  const [note, setNote] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [noButton, setNoButton] = useState({ x: 0, y: 0, rotate: 0 });
  const [noMessage, setNoMessage] = useState('');

  const selectedFood = foodOptions.find((food) => food.id === foodId);
  const canContinuePlan = Boolean(date && time);
  const canSubmit = Boolean(date && time && selectedFood);

  function dodgeNoButton() {
    const nextIndex = Math.floor(Math.random() * noMessages.length);

    setNoButton({
      x: Math.round(Math.random() * 136 - 68),
      y: Math.round(Math.random() * 82 - 41),
      rotate: Math.round(Math.random() * 26 - 13)
    });
    setNoMessage(noMessages[nextIndex]);
  }

  async function submitDateRequest() {
    if (!canSubmit || !selectedFood) return;

    setStage('final');
    setSubmitState('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/date-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer: 'Да',
          date,
          time,
          food: selectedFood.id,
          foodLabel: `${selectedFood.emoji} ${selectedFood.label}`,
          note
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.ok === false) {
        throw new Error(result.error || 'Не удалось отправить Telegram-уведомление');
      }

      setSubmitState(result.delivered === false ? 'saved' : 'sent');
    } catch (error) {
      setSubmitState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Что-то пошло не так');
    }
  }

  function restart() {
    setStage('ask');
    setSubmitState('idle');
    setErrorMessage('');
    setDate('');
    setTime('');
    setFoodId('');
    setNote('');
    setNoButton({ x: 0, y: 0, rotate: 0 });
    setNoMessage('');
  }

  return (
    <main className="page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="floating-hearts" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <span key={index} style={heartStyle(index)} />
        ))}
      </div>

      <section className="invite-card" aria-live="polite">
        <div className="top-pill">только тёплые ответы</div>

        {stage === 'ask' && (
          <div className="screen screen-ask">
            <Sticker type="ask" />
            <h1>Ты пойдёшь со мной на свидание?</h1>
            

            <div className="actions-row playful-actions">
              <button className="primary-button" type="button" onClick={() => setStage('confirm')}>
                Да
              </button>
              <button
                className="ghost-button no-button"
                type="button"
                onClick={dodgeNoButton}
                onPointerEnter={dodgeNoButton}
                style={{ transform: `translate(${noButton.x}px, ${noButton.y}px) rotate(${noButton.rotate}deg)` }}
              >
                Нет
              </button>
            </div>

            {noMessage && <p className="tiny-message">{noMessage}</p>}
          </div>
        )}

        {stage === 'confirm' && (
          <div className="screen screen-confirm">
            <Sticker type="confirm" />
            <h2>Подожди, ты действительно сказала да?</h2>
            <p className="soft-text">Я был готов услышать нет (ага хуй я был уверен что ты скажешь да). Теперь всё серьёзно.</p>
            <button className="primary-button wide-button" type="button" onClick={() => setStage('plan')}>
              Да-да-да 💞
            </button>
          </div>
        )}

        {stage === 'plan' && (
          <div className="screen screen-plan">
            <Sticker type="plan" />
            <h2>Когда ты свободна?</h2>
            <p className="soft-text">Выбери дату и время.</p>

            <div className="form-stack">
              <label className="field-label">
                <span>Дата</span>
                <input type="date" value={date} min={today} onChange={(event) => setDate(event.target.value)} />
              </label>

              <label className="field-label">
                <span>Время</span>
                <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
              </label>
            </div>

            <button
              className="primary-button wide-button"
              type="button"
              disabled={!canContinuePlan}
              onClick={() => setStage('food')}
            >
              Выбрать вкусняшки 💗
            </button>
          </div>
        )}

        {stage === 'food' && (
          <div className="screen screen-food">
            <Sticker type="food" />
            <h2>Что будем кушать?</h2>
            

            <div className="food-grid">
              {foodOptions.map((food) => (
                <button
                  key={food.id}
                  className={`food-card ${foodId === food.id ? 'selected' : ''}`}
                  type="button"
                  onClick={() => setFoodId(food.id)}
                >
                  <span className="food-emoji">{food.emoji}</span>
                  <strong>{food.label}</strong>
                  <small>{food.caption}</small>
                </button>
              ))}
            </div>
            <div className="actions-row">
              <button className="secondary-button" type="button" onClick={() => setStage('plan')}>
                Назад
              </button>
              <button className="primary-button" type="button" disabled={!canSubmit} onClick={submitDateRequest}>
                Подтвердить 💌
              </button>
            </div>
          </div>
        )}

        {stage === 'final' && (
          <div className="screen screen-final">
            <Sticker type="final" />

            {submitState === 'loading' && (
              <>
                <h2>Отправляю сердечко...</h2>
                <p className="soft-text">Сейчас приглашение улетит в Telegram.</p>
                <div className="loader" aria-label="Загрузка" />
              </>
            )}

            {submitState === 'sent' && (
              <>
                <h2>Рад, что ты не отказалась.</h2>
                <p className="result-text">
                  Будь готова к <b>{formatDate(date)}</b> в <b>{time}</b>. Я приеду за тобой.
                </p>
                <div className="summary-box">
                  <span>Выбор еды</span>
                  <strong>{selectedFood ? `${selectedFood.emoji} ${selectedFood.label}` : 'сюрприз'}</strong>
                </div>
                <p className="success-note">Telegram-уведомление отправлено тебе ✅</p>
                <button className="secondary-button wide-button" type="button" onClick={restart}>
                  Пройти ещё раз
                </button>
              </>
            )}

            {submitState === 'saved' && (
              <>
                <h2>Свидание выбрано 💗</h2>
                <p className="result-text">
                  <b>{formatDate(date)}</b> в <b>{time}</b>, еда —{' '}
                  <b>{selectedFood ? selectedFood.label : 'сюрприз'}</b>.
                </p>
                <p className="warning-note">
                  Telegram пока не настроен. Добавь переменные из .env.example, и пуши начнут приходить.
                </p>
                <button className="secondary-button wide-button" type="button" onClick={restart}>
                  Пройти ещё раз
                </button>
              </>
            )}

            {submitState === 'error' && (
              <>
                <h2>Почти получилось</h2>
                <p className="soft-text">Выбор сделан, но Telegram-уведомление не отправилось.</p>
                <div className="error-box">{errorMessage}</div>
                <div className="actions-row">
                  <button className="secondary-button" type="button" onClick={() => setStage('food')}>
                    Назад
                  </button>
                  <button className="primary-button" type="button" onClick={submitDateRequest}>
                    Повторить
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function Sticker({ type }: { type: Stage }) {
  if (type === 'ask') {
    return (
      <div className="sticker sticker-ask" aria-hidden="true">
        <svg viewBox="0 0 280 170" role="img">
          <g className="cat-left">
            <path d="M62 72c2-25 18-38 43-35 23 3 35 19 33 45l-3 45H58l4-55z" fill="#d98a44" />
            <path d="M70 47 58 25l26 11M119 39l22-18-4 31" fill="#d98a44" />
            <path d="M68 68c16 8 34 8 53 0M70 89c14 6 28 7 45 2M72 111c13 4 25 4 39 0" fill="none" stroke="#834b25" strokeWidth="6" strokeLinecap="round" />
            <circle cx="90" cy="70" r="3.5" fill="#5d3827" />
            <circle cx="118" cy="70" r="3.5" fill="#5d3827" />
            <path d="M100 83q7 7 14 0" fill="none" stroke="#5d3827" strokeWidth="3" strokeLinecap="round" />
            <path className="paw" d="M127 101c24 8 42-2 50-20" fill="none" stroke="#d98a44" strokeWidth="12" strokeLinecap="round" />
          </g>
          <g className="rose">
            <path d="M165 82c2 21-5 32-22 45" fill="none" stroke="#61a66a" strokeWidth="4" strokeLinecap="round" />
            <path d="M153 99c-10-5-16-2-20 9 12 1 18-2 20-9z" fill="#78c07b" />
            <circle cx="164" cy="77" r="9" fill="#e94a75" />
            <circle cx="156" cy="81" r="7" fill="#c72f5f" />
            <circle cx="168" cy="86" r="7" fill="#f36c93" />
          </g>
          <g className="cat-right">
            <path d="M183 76c4-25 21-38 43-35 23 3 35 21 32 47l-3 39h-78l6-51z" fill="#fff8f4" />
            <path d="M191 50 184 28l21 12M239 43l24-15-8 31" fill="#fff8f4" />
            <path d="M190 50 184 28l21 12M239 43l24-15-8 31M178 127h77" fill="none" stroke="#6f5b5a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="212" cy="73" r="3.5" fill="#6f5b5a" />
            <circle cx="238" cy="76" r="3.5" fill="#6f5b5a" />
            <path d="M222 89q7 7 14 0" fill="none" stroke="#6f5b5a" strokeWidth="3" strokeLinecap="round" />
            <path d="M197 91c-10 2-18 6-25 12M200 102c-11 3-19 8-24 16M245 95c9 4 16 9 23 17M243 107c9 5 16 11 21 19" fill="none" stroke="#6f5b5a" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        </svg>
      </div>
    );
  }

  if (type === 'confirm') {
    return (
      <div className="sticker sticker-confirm" aria-hidden="true">
        <svg viewBox="0 0 280 170" role="img">
          <g className="heart-cluster">
            <path d="M141 34s-19-11-19-26c0-8 6-14 14-14 5 0 9 3 11 7 2-4 6-7 11-7 8 0 14 6 14 14 0 15-31 26-31 26z" fill="#ed5b91" />
            <path d="M190 57s-14-8-14-19c0-6 5-11 11-11 3 0 7 2 8 5 2-3 5-5 9-5 6 0 11 5 11 11 0 11-25 19-25 19z" fill="#ff86ad" />
          </g>
          <g className="hug-left">
            <path d="M61 88c3-31 24-48 56-43 28 5 44 26 39 59l-8 46H55l6-62z" fill="#d98a44" />
            <path d="M70 59 60 30l29 15M130 49l27-20-7 35" fill="#d98a44" />
            <path d="M79 81c15 7 32 8 48 1M80 103c14 6 29 6 44 1" fill="none" stroke="#874c26" strokeWidth="6" strokeLinecap="round" />
            <path d="M110 92q12 16 30 6" fill="none" stroke="#5b3828" strokeWidth="3" strokeLinecap="round" />
            <path d="M146 109c16 5 27-1 36-14" fill="none" stroke="#d98a44" strokeWidth="14" strokeLinecap="round" />
          </g>
          <g className="hug-right">
            <path d="M128 92c5-33 27-50 58-44 29 5 44 27 39 59l-7 43h-99l9-58z" fill="#fff8f4" />
            <path d="M137 60 130 33l25 15M200 53l28-18-9 35" fill="#fff8f4" />
            <path d="M137 60 130 33l25 15M200 53l28-18-9 35" fill="none" stroke="#756260" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M151 92q13 15 31 3" fill="none" stroke="#6f5b5a" strokeWidth="3" strokeLinecap="round" />
            <path d="M135 113c-16 7-29 2-39-12" fill="none" stroke="#fff8f4" strokeWidth="14" strokeLinecap="round" />
            <path d="M135 113c-16 7-29 2-39-12" fill="none" stroke="#756260" strokeWidth="3" strokeLinecap="round" />
          </g>
        </svg>
      </div>
    );
  }

  if (type === 'plan') {
    return (
      <div className="sticker sticker-plan" aria-hidden="true">
        <svg viewBox="0 0 280 170" role="img">
          <g className="heart-buddy">
            <path d="M139 124s-65-39-65-86c0-23 17-40 39-40 13 0 24 7 30 18 6-11 17-18 31-18 22 0 39 17 39 40 0 47-74 86-74 86z" fill="#f06494" />
            <path d="M92 113c-18 6-29 17-30 35M196 113c16 7 25 19 25 35" fill="none" stroke="#875968" strokeWidth="7" strokeLinecap="round" />
            <path d="M121 141c-8 8-15 9-24 3M165 141c8 8 15 9 24 3" fill="none" stroke="#875968" strokeWidth="6" strokeLinecap="round" />
            <circle cx="126" cy="58" r="4" fill="#884254" />
            <circle cx="162" cy="58" r="4" fill="#884254" />
            <path d="M132 80q12 12 26 0" fill="none" stroke="#884254" strokeWidth="4" strokeLinecap="round" />
            <path className="mini-heart" d="M68 74s-16-9-16-22c0-8 6-14 14-14 5 0 9 3 11 7 2-4 6-7 11-7 8 0 14 6 14 14 0 13-34 22-34 22z" fill="#ff9abd" />
          </g>
        </svg>
      </div>
    );
  }

  if (type === 'food') {
    return (
      <div className="sticker sticker-food" aria-hidden="true">
        <svg viewBox="0 0 280 170" role="img">
          <ellipse cx="140" cy="121" rx="86" ry="31" fill="#fff4da" stroke="#caa872" strokeWidth="5" />
          <ellipse cx="140" cy="116" rx="56" ry="18" fill="#ffd982" />
          <path d="M101 111c19-18 58-18 78 0M104 119c24-14 52-14 72 0M113 126c17-8 36-8 54 0" fill="none" stroke="#f5b540" strokeWidth="7" strokeLinecap="round" />
          <circle className="tomato" cx="145" cy="111" r="28" fill="#df263d" />
          <path d="M135 91c4-10 10-17 20-23M145 91c4-11 12-18 22-24M154 94c8-6 17-11 28-14" fill="none" stroke="#95b83b" strokeWidth="4" strokeLinecap="round" />
          <path d="M182 52c10 29-2 49-25 59" fill="none" stroke="#b7a280" strokeWidth="5" strokeLinecap="round" />
          <path d="M192 50c7 29-2 51-24 65" fill="none" stroke="#b7a280" strokeWidth="5" strokeLinecap="round" />
          <path className="side-heart one" d="M67 97s-18-10-18-24c0-8 6-14 14-14 5 0 9 3 11 7 2-4 6-7 11-7 8 0 14 6 14 14 0 14-32 24-32 24z" fill="#ff8ab1" />
          <path className="side-heart two" d="M218 88s-15-9-15-21c0-7 6-13 13-13 4 0 8 3 10 6 2-3 6-6 10-6 7 0 13 6 13 13 0 12-31 21-31 21z" fill="#e85d91" />
        </svg>
      </div>
    );
  }

  return (
    <div className="sticker sticker-final" aria-hidden="true">
      <svg viewBox="0 0 280 170" role="img">
        <g className="envelope">
          <rect x="58" y="54" width="164" height="92" rx="20" fill="#fff4f8" stroke="#e88bad" strokeWidth="5" />
          <path d="M63 67l77 56 77-56" fill="none" stroke="#e88bad" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M61 137l56-44M219 137l-56-44" fill="none" stroke="#f0a8c0" strokeWidth="4" strokeLinecap="round" />
        </g>
        <path className="big-heart" d="M140 92s-34-20-34-45c0-14 11-25 25-25 8 0 15 4 19 11 4-7 11-11 20-11 14 0 25 11 25 25 0 25-55 45-55 45z" fill="#ec4f86" />
        <path className="spark s1" d="M58 30v22M47 41h22" stroke="#ff9ec0" strokeWidth="6" strokeLinecap="round" />
        <path className="spark s2" d="M223 24v18M214 33h18" stroke="#ff9ec0" strokeWidth="5" strokeLinecap="round" />
        <path className="spark s3" d="M236 105v20M226 115h20" stroke="#ffbfd3" strokeWidth="5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
