/** Russian UI copy for the native shell (web table uses i18n). */
export const strings = {
  login: {
    subtitle: 'Войдите, чтобы получать приглашения за стол и играть в клубе.',
    email: 'Email',
    password: 'Пароль',
    invalidCredentials: 'Неверный email или пароль',
    signIn: 'Войти',
    createAccount: 'Создать аккаунт на сайте'
  },
  lobby: {
    welcome: 'Добро пожаловать',
    subtitle: 'Виртуальные фишки — холдем или джокер с ботами, приглашения из push.',
    modeHoldem: 'Холдем',
    modeJoker: 'Джокер',
    jokerFourPlayers: 'Джокер — всегда 4 игрока за столом.',
    opponentBot: 'С ботами',
    opponentHuman: 'С людьми',
    quickHuman: 'Очередь с игроками',
    quickJokerHuman: 'Джокер — очередь (4 игрока)',
    jokerStrict: 'Строгий джокер',
    jokerMinus: 'Минусовой подсчёт',
    quickBot: 'Быстрый стол с ботом',
    quickJokerBot: 'Джокер с ботами (4 места)',
    starting: 'Запуск…',
    searching: 'Ищем соперников…',
    matched: 'Стол найден!',
    waiting: 'Ожидание в очереди…',
    waitingJoker: 'Ожидание игроков — в Джокере нужно 4 за столом…',
    queueStarted: 'Очередь запущена',
    queueFailed: 'Ошибка очереди — проверьте API URL',
    signOut: 'Выйти'
  },
  table: {
    signInRequired: 'Войдите, чтобы играть',
    goToLogin: 'Перейти к входу',
    backToLobby: '← Лобби',
    loading: 'Загрузка стола…',
    joining: 'Подключение к столу…',
    joinFailed: 'Не удалось войти за стол',
    loadFailed: 'Не удалось загрузить стол',
    retry: 'Повторить'
  },
  invite: {
    title: 'Приглашение в клуб',
    code: 'Код',
    acceptFailed: 'Не удалось принять приглашение',
    backToLobby: 'В лобби'
  }
} as const;
