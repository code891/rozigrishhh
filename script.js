
// Глобальные переменные
let currentUser = null;
let isAdmin = false;
let currentTheme = 'light';
let giveaways = [];
let userStats = {};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Инициализация Telegram WebApp
function initializeApp() {
    // Инициализируем Telegram WebApp
    if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
        
        // Получаем данные пользователя
        currentUser = Telegram.WebApp.initDataUnsafe?.user;
        
        if (currentUser) {
            initializeUser();
        } else {
            // Для тестирования без Telegram
            currentUser = {
                id: 123456789,
                first_name: "Тестовый",
                last_name: "Пользователь",
                username: "testuser"
            };
            initializeUser();
        }
    } else {
        // Для тестирования без Telegram
        currentUser = {
            id: 123456789,
            first_name: "Тестовый",
            last_name: "Пользователь", 
            username: "testuser"
        };
        initializeUser();
    }
}

// Инициализация пользователя
async function initializeUser() {
    try {
        showLoading(true);
        
        // Отправляем данные пользователя на сервер
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                username: currentUser.username,
                first_name: currentUser.first_name,
                last_name: currentUser.last_name
            })
        });
        
        const userData = await response.json();
        
        if (userData.success) {
            isAdmin = userData.is_admin;
            userStats = userData.stats;
            
            // Настраиваем интерфейс
            setupUI();
            loadUserData();
            loadGiveaways();
            
            // Показываем главную страницу
            showLoading(false);
        } else {
            showNotification('Ошибка авторизации', 'error');
        }
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showNotification('Ошибка подключения к серверу', 'error');
        showLoading(false);
    }
}

// Настройка интерфейса
function setupUI() {
    // Показываем админские элементы если пользователь админ
    if (isAdmin) {
        document.body.classList.add('is-admin');
    }
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Загружаем тему
    loadTheme();
    
    // Обновляем информацию о пользователе
    updateUserInfo();
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Табы
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Админ навигация
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchAdminSection(btn.dataset.section));
    });
    
    // Переключатель темы
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // Обновление розыгрышей
    document.getElementById('refresh-giveaways').addEventListener('click', loadGiveaways);
    
    // Поиск пользователей
    document.getElementById('user-search').addEventListener('input', debounce(searchUsers, 300));
    
    // Закрытие модального окна
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
}

// Переключение табов
function switchTab(tabName) {
    // Убираем активные классы
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Добавляем активные классы
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Загружаем данные для таба
    loadTabData(tabName);
}

// Переключение админских секций
function switchAdminSection(sectionName) {
    // Убираем активные классы
    document.querySelectorAll('.admin-nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.admin-content').forEach(content => content.classList.remove('active'));
    
    // Добавляем активные классы
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
    document.getElementById(`admin-${sectionName}`).classList.add('active');
    
    // Загружаем данные для секции
    loadAdminData(sectionName);
}

// Загрузка данных для табов
function loadTabData(tabName) {
    switch(tabName) {
        case 'giveaways':
            loadGiveaways();
            break;
        case 'profile':
            loadUserProfile();
            break;
        case 'earn':
            loadEarnData();
            break;
        case 'admin':
            if (isAdmin) loadAdminData('overview');
            break;
    }
}

// Загрузка данных пользователя
async function loadUserData() {
    try {
        const response = await fetch(`/api/user/${currentUser.id}`);
        const data = await response.json();
        
        if (data.success) {
            userStats = data.user;
            updateUserBalance(data.user.balance);
            updateUserInfo();
        }
    } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
    }
}

// Загрузка розыгрышей
async function loadGiveaways() {
    try {
        const response = await fetch('/api/giveaways');
        const data = await response.json();
        
        if (data.success) {
            giveaways = data.giveaways;
            renderGiveaways();
        } else {
            showNotification('Ошибка загрузки розыгрышей', 'error');
        }
    } catch (error) {
        console.error('Ошибка загрузки розыгрышей:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    }
}

// Отрисовка розыгрышей
function renderGiveaways() {
    const container = document.getElementById('giveaways-list');
    
    if (giveaways.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🎁</div>
                <h3>Нет активных розыгрышей</h3>
                <p>Новые розыгрыши появятся здесь</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = giveaways.map(giveaway => `
        <div class="giveaway-card" onclick="openGiveaway(${giveaway.id})">
            <div class="giveaway-header">
                <div class="giveaway-image">
                    ${giveaway.photo_file_id ? 
                        `<img src="/api/photo/${giveaway.photo_file_id}" alt="${giveaway.name}">` : 
                        '🎁'
                    }
                </div>
                <div class="giveaway-title">
                    <h3>${giveaway.name}</h3>
                    <div class="giveaway-status">Активный до ${giveaway.end_date}</div>
                </div>
            </div>
            
            <div class="giveaway-description">
                ${giveaway.description}
            </div>
            
            <div class="giveaway-details">
                <div class="detail-item">
                    <span class="detail-label">Участников</span>
                    <span class="detail-value">${giveaway.participants_count || 0}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Всего билетов</span>
                    <span class="detail-value">${giveaway.total_tickets || 0}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Призовых мест</span>
                    <span class="detail-value">${giveaway.prize_places}</span>
                </div>
                ${giveaway.user_tickets ? `
                <div class="detail-item">
                    <span class="detail-label">Ваши билеты</span>
                    <span class="detail-value">${giveaway.user_tickets}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="giveaway-actions">
                ${giveaway.user_tickets > 0 ? 
                    `<button class="giveaway-btn btn-success" onclick="event.stopPropagation(); addMoreTickets(${giveaway.id})">
                        ➕ Добавить билеты
                    </button>` :
                    `<button class="giveaway-btn btn-primary" onclick="event.stopPropagation(); participateInGiveaway(${giveaway.id})">
                        🎯 Участвовать
                    </button>`
                }
                <button class="giveaway-btn btn-secondary" onclick="event.stopPropagation(); viewGiveawayDetails(${giveaway.id})">
                    📋 Подробнее
                </button>
            </div>
        </div>
    `).join('');
}

// Открытие розыгрыша
function openGiveaway(giveawayId) {
    const giveaway = giveaways.find(g => g.id === giveawayId);
    if (!giveaway) return;
    
    viewGiveawayDetails(giveawayId);
}

// Просмотр деталей розыгрыша
function viewGiveawayDetails(giveawayId) {
    const giveaway = giveaways.find(g => g.id === giveawayId);
    if (!giveaway) return;
    
    const prizesHtml = giveaway.prizes ? 
        Object.entries(giveaway.prizes).map(([place, prize]) => `
            <div class="prize-item">
                <span class="prize-place">${getPlaceMedal(place)} ${place} место:</span>
                <span class="prize-description">${prize}</span>
            </div>
        `).join('') : 
        '<p>Призы будут объявлены позже</p>';
    
    const modalContent = `
        <div class="giveaway-details-modal">
            <div class="modal-giveaway-header">
                <h2>${giveaway.name}</h2>
                ${giveaway.photo_file_id ? 
                    `<img src="/api/photo/${giveaway.photo_file_id}" alt="${giveaway.name}" class="modal-giveaway-image">` : 
                    ''
                }
            </div>
            
            <div class="modal-section">
                <h3>📝 Описание</h3>
                <p>${giveaway.description}</p>
            </div>
            
            <div class="modal-section">
                <h3>🏆 Призы</h3>
                <div class="prizes-list">
                    ${prizesHtml}
                </div>
            </div>
            
            <div class="modal-section">
                <h3>📊 Статистика</h3>
                <div class="stats-row">
                    <div class="stat-item">
                        <strong>Участников:</strong> ${giveaway.participants_count || 0}
                    </div>
                    <div class="stat-item">
                        <strong>Всего билетов:</strong> ${giveaway.total_tickets || 0}
                    </div>
                    <div class="stat-item">
                        <strong>Начало:</strong> ${giveaway.start_date}
                    </div>
                    <div class="stat-item">
                        <strong>Окончание:</strong> ${giveaway.end_date}
                    </div>
                </div>
                
                ${giveaway.user_tickets ? `
                <div class="user-participation">
                    <h4>Ваше участие</h4>
                    <p>У вас ${giveaway.user_tickets} билетов в этом розыгрыше</p>
                    ${giveaway.total_tickets > 0 ? 
                        `<p>Ваши шансы: ${((giveaway.user_tickets / giveaway.total_tickets) * 100).toFixed(2)}%</p>` : 
                        ''
                    }
                </div>
                ` : ''}
            </div>
            
            <div class="modal-actions">
                ${giveaway.user_tickets > 0 ? 
                    `<button class="btn-primary" onclick="addMoreTickets(${giveaway.id})">
                        ➕ Добавить билеты
                    </button>` :
                    `<button class="btn-primary" onclick="participateInGiveaway(${giveaway.id})">
                        🎯 Участвовать в розыгрыше
                    </button>`
                }
                <button class="btn-secondary" onclick="closeModal()">Закрыть</button>
            </div>
        </div>
    `;
    
    showModal('Детали розыгрыша', modalContent);
}

// Участие в розыгрыше
function participateInGiveaway(giveawayId) {
    const modalContent = `
        <div class="participate-modal">
            <p>Сколько билетов вы хотите использовать для участия?</p>
            <div class="current-balance">
                Доступно билетов: <strong id="available-balance">${userStats.balance || 0}</strong>
            </div>
            
            <div class="tickets-input-section">
                <label for="tickets-count">Количество билетов:</label>
                <div class="tickets-input-group">
                    <button type="button" onclick="changeTicketsCount(-1)">-</button>
                    <input type="number" id="tickets-count" value="1" min="1" max="${userStats.balance || 0}">
                    <button type="button" onclick="changeTicketsCount(1)">+</button>
                </div>
                <div class="quick-buttons">
                    <button type="button" onclick="setTicketsCount(1)">1</button>
                    <button type="button" onclick="setTicketsCount(5)">5</button>
                    <button type="button" onclick="setTicketsCount(10)">10</button>
                    <button type="button" onclick="setTicketsCount(${userStats.balance || 0})">Все</button>
                </div>
            </div>
            
            <div class="modal-actions">
                <button class="btn-primary" onclick="confirmParticipation(${giveawayId})">
                    🎯 Участвовать
                </button>
                <button class="btn-secondary" onclick="closeModal()">Отмена</button>
            </div>
        </div>
    `;
    
    showModal('Участие в розыгрыше', modalContent);
}

// Добавление билетов
function addMoreTickets(giveawayId) {
    participateInGiveaway(giveawayId); // Используем ту же модалку
}

// Изменение количества билетов
function changeTicketsCount(delta) {
    const input = document.getElementById('tickets-count');
    const currentValue = parseInt(input.value) || 1;
    const newValue = Math.max(1, Math.min(userStats.balance || 0, currentValue + delta));
    input.value = newValue;
}

// Установка количества билетов
function setTicketsCount(count) {
    const input = document.getElementById('tickets-count');
    input.value = Math.max(1, Math.min(userStats.balance || 0, count));
}

// Подтверждение участия
async function confirmParticipation(giveawayId) {
    const ticketsCount = parseInt(document.getElementById('tickets-count').value);
    
    if (ticketsCount <= 0 || ticketsCount > (userStats.balance || 0)) {
        showNotification('Некорректное количество билетов', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/participate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                giveaway_id: giveawayId,
                tickets_count: ticketsCount
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Успешно! Использовано ${ticketsCount} билетов`, 'success');
            closeModal();
            loadUserData();
            loadGiveaways();
        } else {
            showNotification(data.message || 'Ошибка участия', 'error');
        }
    } catch (error) {
        console.error('Ошибка участия:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    }
}

// Загрузка профиля пользователя
async function loadUserProfile() {
    try {
        const response = await fetch(`/api/user/${currentUser.id}/profile`);
        const data = await response.json();
        
        if (data.success) {
            updateProfileData(data.profile);
        }
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
    }
}

// Обновление данных профиля
function updateProfileData(profile) {
    // Обновляем основную информацию
    document.getElementById('profile-name').textContent = 
        `${currentUser.first_name} ${currentUser.last_name || ''}`.trim();
    document.getElementById('profile-id').textContent = `ID: ${currentUser.id}`;
    
    // Обновляем инициалы
    const initials = (currentUser.first_name[0] + (currentUser.last_name?.[0] || '')).toUpperCase();
    document.getElementById('profile-initials').textContent = initials;
    
    // Обновляем статистику
    document.getElementById('total-tickets').textContent = profile.total_tickets || 0;
    document.getElementById('active-participations').textContent = profile.active_participations || 0;
    document.getElementById('referrals-count').textContent = profile.referrals_count || 0;
    
    // Обновляем информацию о сгораемых билетах
    if (profile.expiring_tickets && profile.expiring_tickets.total > 0) {
        document.getElementById('expiring-tickets-info').classList.remove('hidden');
        document.getElementById('expiring-details').textContent = 
            `${profile.expiring_tickets.total} билетов сгорят через ${profile.expiring_tickets.days_until_expiry} дней`;
    } else {
        document.getElementById('expiring-tickets-info').classList.add('hidden');
    }
}

// Загрузка данных заработка
async function loadEarnData() {
    try {
        const response = await fetch(`/api/user/${currentUser.id}/earn`);
        const data = await response.json();
        
        if (data.success) {
            updateEarnData(data.earn);
        }
    } catch (error) {
        console.error('Ошибка загрузки данных заработка:', error);
    }
}

// Обновление данных заработка
function updateEarnData(earnData) {
    document.getElementById('referral-count').textContent = earnData.referrals_count || 0;
    document.getElementById('referral-earned').textContent = earnData.referral_earned || 0;
    
    // Обновляем кнопку подписок
    const subscriptionBtn = document.getElementById('subscription-btn');
    const subscriptionCard = document.getElementById('subscription-card');
    
    if (earnData.can_get_subscription_tickets) {
        subscriptionBtn.textContent = 'Получить билеты';
        subscriptionBtn.disabled = false;
        subscriptionCard.classList.remove('disabled');
    } else {
        subscriptionBtn.textContent = `Следующие через ${earnData.days_until_next || 0} дней`;
        subscriptionBtn.disabled = true;
        subscriptionCard.classList.add('disabled');
    }
}

// Проверка подписок
async function checkSubscriptions() {
    try {
        const response = await fetch('/api/check-subscriptions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUser.id
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.got_tickets) {
                showNotification('🎉 Вы получили 10 билетов за подписки!', 'success');
                loadUserData();
                loadEarnData();
            } else {
                showChannelsModal(data.channels);
            }
        } else {
            showNotification(data.message || 'Ошибка проверки подписок', 'error');
        }
    } catch (error) {
        console.error('Ошибка проверки подписок:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    }
}

// Показать модалку с каналами
function showChannelsModal(channels) {
    const channelsHtml = channels.map(channel => `
        <div class="channel-item">
            <span class="channel-name">${channel}</span>
            <a href="https://t.me/${channel.replace('@', '')}" target="_blank" class="channel-link">
                Подписаться
            </a>
        </div>
    `).join('');
    
    const modalContent = `
        <div class="channels-modal">
            <p>Подпишитесь на все наши каналы для получения 10 билетов:</p>
            <div class="channels-list">
                ${channelsHtml}
            </div>
            <div class="modal-actions">
                <button class="btn-primary" onclick="checkSubscriptions()">
                    ✅ Проверить подписки
                </button>
                <button class="btn-secondary" onclick="closeModal()">Закрыть</button>
            </div>
        </div>
    `;
    
    showModal('Подпишитесь на каналы', modalContent);
}

// Сделать сторис
function makeStory() {
    const modalContent = `
        <div class="story-modal">
            <h3>📸 Как получить +50 билетов за сторис:</h3>
            <ol>
                <li>Сделайте скриншот нашего бота</li>
                <li>Опубликуйте сторис в Instagram или другой соцсети</li>
                <li>Отправьте скриншот сторис в поддержку @Kalashnikeforce</li>
                <li>Получите 50 билетов после проверки!</li>
            </ol>
            <div class="modal-actions">
                <button class="btn-primary" onclick="openSupport()">
                    💬 Написать в поддержку
                </button>
                <button class="btn-secondary" onclick="closeModal()">Понятно</button>
            </div>
        </div>
    `;
    
    showModal('Сторис за билеты', modalContent);
}

// Открыть поддержку
function openSupport() {
    if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
        Telegram.WebApp.openTelegramLink('https://t.me/Kalashnikeforce');
    } else {
        window.open('https://t.me/Kalashnikeforce', '_blank');
    }
    closeModal();
}

// Поделиться реферальной ссылкой
async function shareReferralLink() {
    try {
        const response = await fetch(`/api/user/${currentUser.id}/referral`);
        const data = await response.json();
        
        if (data.success) {
            const referralLink = data.referral_link;
            
            if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
                Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('🎉 Присоединяйся к розыгрышам и выигрывай крутые призы!')}`);
            } else {
                // Копируем в буфер обмена
                navigator.clipboard.writeText(referralLink).then(() => {
                    showNotification('Ссылка скопирована в буфер обмена', 'success');
                });
            }
        }
    } catch (error) {
        console.error('Ошибка получения реферальной ссылки:', error);
        showNotification('Ошибка получения ссылки', 'error');
    }
}

// Показать мои билеты
async function showMyTickets() {
    try {
        const response = await fetch(`/api/user/${currentUser.id}/tickets`);
        const data = await response.json();
        
        if (data.success) {
            const ticketsHtml = data.tickets.length > 0 ? 
                data.tickets.map(ticket => `
                    <div class="ticket-item">
                        <span class="ticket-number">№${ticket.number}</span>
                        <span class="ticket-giveaway">${ticket.giveaway_name}</span>
                        <span class="ticket-date">${formatDate(ticket.obtained_at)}</span>
                    </div>
                `).join('') :
                '<p class="empty-message">У вас пока нет активных билетов</p>';
            
            const modalContent = `
                <div class="tickets-modal">
                    <h3>🎫 Ваши активные билеты (${data.tickets.length})</h3>
                    <div class="tickets-list">
                        ${ticketsHtml}
                    </div>
                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="closeModal()">Закрыть</button>
                    </div>
                </div>
            `;
            
            showModal('Мои билеты', modalContent);
        }
    } catch (error) {
        console.error('Ошибка загрузки билетов:', error);
        showNotification('Ошибка загрузки билетов', 'error');
    }
}

// Показать прошлые розыгрыши
async function showPastGiveaways() {
    try {
        const response = await fetch(`/api/user/${currentUser.id}/past-giveaways`);
        const data = await response.json();
        
        if (data.success) {
            const historyHtml = data.giveaways.length > 0 ?
                data.giveaways.map(giveaway => `
                    <div class="history-item ${giveaway.won ? 'won' : ''}">
                        <div class="history-header">
                            <h4>${giveaway.name}</h4>
                            <span class="history-status">
                                ${giveaway.won ? '🏆 Выиграли!' : '😔 Не выиграли'}
                            </span>
                        </div>
                        <div class="history-details">
                            <span>Билетов: ${giveaway.user_tickets_count}</span>
                            <span>Завершен: ${giveaway.end_date}</span>
                        </div>
                    </div>
                `).join('') :
                '<p class="empty-message">Вы еще не участвовали в завершенных розыгрышах</p>';
            
            const modalContent = `
                <div class="history-modal">
                    <h3>📜 История участий</h3>
                    <div class="history-list">
                        ${historyHtml}
                    </div>
                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="closeModal()">Закрыть</button>
                    </div>
                </div>
            `;
            
            showModal('История участий', modalContent);
        }
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
        showNotification('Ошибка загрузки истории', 'error');
    }
}

// Показать рефералов
async function showReferrals() {
    try {
        const response = await fetch(`/api/user/${currentUser.id}/referrals`);
        const data = await response.json();
        
        if (data.success) {
            const referralsHtml = data.referrals.length > 0 ?
                data.referrals.map(referral => `
                    <div class="referral-item">
                        <div class="referral-info">
                            <span class="referral-name">${referral.full_name}</span>
                            <span class="referral-username">@${referral.username || 'нет'}</span>
                        </div>
                        <div class="referral-date">${formatDate(referral.created_at)}</div>
                    </div>
                `).join('') :
                '<p class="empty-message">У вас пока нет рефералов</p>';
            
            const modalContent = `
                <div class="referrals-modal">
                    <h3>👥 Ваши рефералы (${data.referrals.length})</h3>
                    <div class="referrals-stats">
                        <div class="stat">
                            <strong>Приглашено:</strong> ${data.referrals.length}
                        </div>
                        <div class="stat">
                            <strong>Заработано:</strong> ${data.earned} билетов
                        </div>
                    </div>
                    <div class="referrals-list">
                        ${referralsHtml}
                    </div>
                    <div class="modal-actions">
                        <button class="btn-primary" onclick="shareReferralLink()">
                            📤 Пригласить еще
                        </button>
                        <button class="btn-secondary" onclick="closeModal()">Закрыть</button>
                    </div>
                </div>
            `;
            
            showModal('Мои рефералы', modalContent);
        }
    } catch (error) {
        console.error('Ошибка загрузки рефералов:', error);
        showNotification('Ошибка загрузки рефералов', 'error');
    }
}

// АДМИНСКИЕ ФУНКЦИИ

// Загрузка админских данных
async function loadAdminData(section) {
    if (!isAdmin) return;
    
    switch(section) {
        case 'overview':
            loadAdminOverview();
            break;
        case 'giveaways':
            loadAdminGiveaways();
            break;
        case 'users':
            loadAdminUsers();
            break;
        case 'statistics':
            loadAdminStatistics();
            break;
    }
}

// Загрузка обзора админки
async function loadAdminOverview() {
    try {
        const response = await fetch('/api/admin/overview');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('total-users').textContent = data.stats.total_users;
            document.getElementById('active-giveaways-count').textContent = data.stats.active_giveaways;
            document.getElementById('total-tickets-issued').textContent = data.stats.total_tickets;
            document.getElementById('completed-giveaways-count').textContent = data.stats.completed_giveaways;
        }
    } catch (error) {
        console.error('Ошибка загрузки обзора:', error);
    }
}

// Загрузка админских розыгрышей
async function loadAdminGiveaways() {
    try {
        const response = await fetch('/api/admin/giveaways');
        const data = await response.json();
        
        if (data.success) {
            renderAdminGiveaways(data.giveaways);
        }
    } catch (error) {
        console.error('Ошибка загрузки админских розыгрышей:', error);
    }
}

// Отрисовка админских розыгрышей
function renderAdminGiveaways(adminGiveaways) {
    const container = document.getElementById('admin-giveaways-list');
    
    if (adminGiveaways.length === 0) {
        container.innerHTML = '<p class="empty-message">Нет розыгрышей</p>';
        return;
    }
    
    container.innerHTML = adminGiveaways.map(giveaway => `
        <div class="admin-giveaway-card">
            <div class="admin-giveaway-header">
                <h4>${giveaway.name}</h4>
                <span class="status-badge ${giveaway.status}">${giveaway.status === 'active' ? 'Активный' : 'Завершен'}</span>
            </div>
            <div class="admin-giveaway-stats">
                <span>Участников: ${giveaway.participants_count}</span>
                <span>Билетов: ${giveaway.total_tickets}</span>
                <span>До: ${giveaway.end_date}</span>
            </div>
            <div class="admin-giveaway-actions">
                <button class="admin-btn" onclick="viewGiveawayParticipants(${giveaway.id})">
                    👥 Участники
                </button>
                ${giveaway.status === 'active' ? `
                    <button class="admin-btn" onclick="editGiveaway(${giveaway.id})">
                        ✏️ Редактировать
                    </button>
                    <button class="admin-btn success" onclick="completeGiveaway(${giveaway.id})">
                        🏆 Завершить
                    </button>
                ` : ''}
                <button class="admin-btn danger" onclick="deleteGiveaway(${giveaway.id})">
                    🗑️ Удалить
                </button>
            </div>
        </div>
    `).join('');
}

// Создание розыгрыша
function showCreateGiveaway() {
    const modalContent = `
        <div class="create-giveaway-modal">
            <form id="create-giveaway-form">
                <div class="form-group">
                    <label for="giveaway-name">Название розыгрыша:</label>
                    <input type="text" id="giveaway-name" required maxlength="100">
                </div>
                
                <div class="form-group">
                    <label for="giveaway-description">Описание:</label>
                    <textarea id="giveaway-description" rows="3" maxlength="1000"></textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="start-date">Дата начала:</label>
                        <input type="date" id="start-date" required>
                    </div>
                    <div class="form-group">
                        <label for="end-date">Дата окончания:</label>
                        <input type="date" id="end-date" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="prize-places">Количество призовых мест:</label>
                    <input type="number" id="prize-places" min="1" max="20" value="1" required>
                </div>
                
                <div class="form-group">
                    <label>Призы:</label>
                    <div id="prizes-container">
                        <div class="prize-input">
                            <input type="text" placeholder="1 место: Описание приза" data-place="1">
                        </div>
                    </div>
                    <button type="button" onclick="addPrizeInput()" class="add-prize-btn">+ Добавить приз</button>
                </div>
                
                <div class="form-group">
                    <label for="giveaway-photo">Фото (необязательно):</label>
                    <input type="file" id="giveaway-photo" accept="image/*">
                </div>
                
                <div class="modal-actions">
                    <button type="submit" class="btn-primary">🎉 Создать розыгрыш</button>
                    <button type="button" class="btn-secondary" onclick="closeModal()">Отмена</button>
                </div>
            </form>
        </div>
    `;
    
    showModal('Создать розыгрыш', modalContent);
    
    // Устанавливаем минимальную дату
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('start-date').value = today;
    document.getElementById('end-date').value = today;
    
    // Обработчик формы
    document.getElementById('create-giveaway-form').addEventListener('submit', handleCreateGiveaway);
    
    // Обработчик изменения количества мест
    document.getElementById('prize-places').addEventListener('change', updatePrizeInputs);
}

// Добавление поля для приза
function addPrizeInput() {
    const container = document.getElementById('prizes-container');
    const currentInputs = container.querySelectorAll('.prize-input').length;
    const newPlace = currentInputs + 1;
    
    const prizeInput = document.createElement('div');
    prizeInput.className = 'prize-input';
    prizeInput.innerHTML = `
        <input type="text" placeholder="${newPlace} место: Описание приза" data-place="${newPlace}">
        <button type="button" onclick="removePrizeInput(this)" class="remove-prize-btn">×</button>
    `;
    
    container.appendChild(prizeInput);
}

// Удаление поля приза
function removePrizeInput(button) {
    button.parentElement.remove();
    updatePrizeInputsNumbers();
}

// Обновление полей призов
function updatePrizeInputs() {
    const prizePlaces = parseInt(document.getElementById('prize-places').value);
    const container = document.getElementById('prizes-container');
    const currentInputs = container.querySelectorAll('.prize-input');
    
    // Добавляем или удаляем поля
    while (currentInputs.length < prizePlaces) {
        addPrizeInput();
    }
    
    while (currentInputs.length > prizePlaces) {
        currentInputs[currentInputs.length - 1].remove();
    }
    
    updatePrizeInputsNumbers();
}

// Обновление нумерации призов
function updatePrizeInputsNumbers() {
    const inputs = document.querySelectorAll('#prizes-container .prize-input input');
    inputs.forEach((input, index) => {
        const place = index + 1;
        input.dataset.place = place;
        input.placeholder = `${place} место: Описание приза`;
    });
}

// Обработка создания розыгрыша
async function handleCreateGiveaway(event) {
    event.preventDefault();
    
    const formData = new FormData();
    formData.append('name', document.getElementById('giveaway-name').value);
    formData.append('description', document.getElementById('giveaway-description').value);
    formData.append('start_date', document.getElementById('start-date').value);
    formData.append('end_date', document.getElementById('end-date').value);
    formData.append('prize_places', document.getElementById('prize-places').value);
    
    // Собираем призы
    const prizes = {};
    document.querySelectorAll('#prizes-container .prize-input input').forEach(input => {
        if (input.value.trim()) {
            prizes[input.dataset.place] = input.value.trim();
        }
    });
    formData.append('prizes', JSON.stringify(prizes));
    
    // Добавляем фото если есть
    const photoFile = document.getElementById('giveaway-photo').files[0];
    if (photoFile) {
        formData.append('photo', photoFile);
    }
    
    try {
        const response = await fetch('/api/admin/create-giveaway', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Розыгрыш успешно создан!', 'success');
            closeModal();
            loadAdminGiveaways();
        } else {
            showNotification(data.message || 'Ошибка создания розыгрыша', 'error');
        }
    } catch (error) {
        console.error('Ошибка создания розыгрыша:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    }
}

// Завершение розыгрыша
async function completeGiveaway(giveawayId) {
    if (!confirm('Вы уверены, что хотите завершить этот розыгрыш? Это действие нельзя отменить.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/complete-giveaway', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                giveaway_id: giveawayId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Розыгрыш успешно завершен!', 'success');
            loadAdminGiveaways();
            
            // Показываем информацию о победителе
            if (data.winner) {
                showWinnerInfo(data.winner, data.giveaway);
            }
        } else {
            showNotification(data.message || 'Ошибка завершения розыгрыша', 'error');
        }
    } catch (error) {
        console.error('Ошибка завершения розыгрыша:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    }
}

// Показать информацию о победителе
function showWinnerInfo(winner, giveaway) {
    const modalContent = `
        <div class="winner-info-modal">
            <div class="winner-celebration">🎉</div>
            <h3>Победитель определен!</h3>
            <div class="winner-details">
                <div class="winner-card">
                    <h4>${winner.full_name}</h4>
                    <p>ID: ${winner.user_id}</p>
                    <p>Выигрышный билет: №${winner.ticket_number}</p>
                </div>
            </div>
            <p>Розыгрыш: <strong>${giveaway.name}</strong></p>
            <div class="modal-actions">
                <button class="btn-primary" onclick="closeModal()">Отлично!</button>
            </div>
        </div>
    `;
    
    showModal('🏆 Победитель', modalContent);
}

// Удаление розыгрыша
async function deleteGiveaway(giveawayId) {
    if (!confirm('Вы уверены, что хотите удалить этот розыгрыш? Все билеты будут возвращены участникам.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/delete-giveaway', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                giveaway_id: giveawayId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Розыгрыш удален, билеты возвращены участникам', 'success');
            loadAdminGiveaways();
        } else {
            showNotification(data.message || 'Ошибка удаления розыгрыша', 'error');
        }
    } catch (error) {
        console.error('Ошибка удаления розыгрыша:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    }
}

// Просмотр участников розыгрыша
async function viewGiveawayParticipants(giveawayId) {
    try {
        const response = await fetch(`/api/admin/giveaway/${giveawayId}/participants`);
        const data = await response.json();
        
        if (data.success) {
            const participantsHtml = data.participants.length > 0 ?
                data.participants.map((participant, index) => `
                    <div class="participant-item">
                        <span class="participant-number">${index + 1}.</span>
                        <div class="participant-info">
                            <strong>${participant.full_name}</strong>
                            <span>@${participant.username || 'нет'}</span>
                            <span>ID: ${participant.user_id}</span>
                        </div>
                        <div class="participant-tickets">
                            ${participant.tickets} билетов
                        </div>
                    </div>
                `).join('') :
                '<p class="empty-message">Нет участников</p>';
            
            const modalContent = `
                <div class="participants-modal">
                    <h3>👥 Участники розыгрыша</h3>
                    <div class="participants-stats">
                        <span>Всего участников: <strong>${data.participants.length}</strong></span>
                        <span>Всего билетов: <strong>${data.total_tickets}</strong></span>
                    </div>
                    <div class="participants-list">
                        ${participantsHtml}
                    </div>
                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="closeModal()">Закрыть</button>
                    </div>
                </div>
            `;
            
            showModal('Участники розыгрыша', modalContent);
        }
    } catch (error) {
        console.error('Ошибка загрузки участников:', error);
        showNotification('Ошибка загрузки участников', 'error');
    }
}

// Загрузка пользователей для админки
async function loadAdminUsers() {
    // Функциональность поиска и управления пользователями
}

// Поиск пользователей
async function searchUsers() {
    const query = document.getElementById('user-search').value.trim();
    if (query.length < 3) return;
    
    try {
        const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.success) {
            displaySearchResults(data.users);
        }
    } catch (error) {
        console.error('Ошибка поиска пользователей:', error);
    }
}

// Отображение результатов поиска
function displaySearchResults(users) {
    const resultArea = document.getElementById('user-management-result');
    
    if (users.length === 0) {
        resultArea.innerHTML = '<p>Пользователи не найдены</p>';
        return;
    }
    
    resultArea.innerHTML = users.map(user => `
        <div class="user-result-item">
            <div class="user-info">
                <strong>${user.full_name}</strong>
                <span>@${user.username || 'нет'}</span>
                <span>ID: ${user.user_id}</span>
            </div>
            <div class="user-stats">
                <span>Билетов: ${user.balance}</span>
                <span>Статус: ${user.banned ? 'Забанен' : 'Активен'}</span>
            </div>
            <div class="user-actions">
                <button class="admin-btn" onclick="manageUser(${user.user_id})">Управлять</button>
            </div>
        </div>
    `).join('');
}

// Управление пользователем
function manageUser(userId) {
    const modalContent = `
        <div class="manage-user-modal">
            <h3>Управление пользователем ID: ${userId}</h3>
            <div class="user-management-actions">
                <button class="user-action-btn" onclick="showTicketsManagement(${userId}, 'add')">
                    💰 Начислить билеты
                </button>
                <button class="user-action-btn" onclick="showTicketsManagement(${userId}, 'remove')">
                    💸 Списать билеты
                </button>
                <button class="user-action-btn danger" onclick="banUser(${userId})">
                    🚫 Забанить
                </button>
                <button class="user-action-btn success" onclick="unbanUser(${userId})">
                    ✅ Разбанить
                </button>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" onclick="closeModal()">Закрыть</button>
            </div>
        </div>
    `;
    
    showModal('Управление пользователем', modalContent);
}

// Управление билетами пользователя
function showTicketsManagement(userId, action) {
    const actionText = action === 'add' ? 'начислить' : 'списать';
    const icon = action === 'add' ? '💰' : '💸';
    
    const modalContent = `
        <div class="tickets-management-modal">
            <h3>${icon} ${actionText.charAt(0).toUpperCase() + actionText.slice(1)} билеты</h3>
            <p>Пользователь ID: ${userId}</p>
            
            <div class="tickets-input-section">
                <label for="tickets-amount">Количество билетов:</label>
                <div class="tickets-input-group">
                    <button type="button" onclick="changeTicketsAmount(-1)">-</button>
                    <input type="number" id="tickets-amount" value="1" min="1" max="1000">
                    <button type="button" onclick="changeTicketsAmount(1)">+</button>
                </div>
                <div class="quick-buttons">
                    <button type="button" onclick="setTicketsAmount(1)">1</button>
                    <button type="button" onclick="setTicketsAmount(5)">5</button>
                    <button type="button" onclick="setTicketsAmount(10)">10</button>
                    <button type="button" onclick="setTicketsAmount(50)">50</button>
                </div>
            </div>
            
            <div class="modal-actions">
                <button class="btn-primary" onclick="confirmTicketsAction(${userId}, '${action}')">
                    ${icon} ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}
                </button>
                <button class="btn-secondary" onclick="closeModal()">Отмена</button>
            </div>
        </div>
    `;
    
    showModal(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} билеты`, modalContent);
}

// Изменение количества билетов для админа
function changeTicketsAmount(delta) {
    const input = document.getElementById('tickets-amount');
    const currentValue = parseInt(input.value) || 1;
    const newValue = Math.max(1, Math.min(1000, currentValue + delta));
    input.value = newValue;
}

// Установка количества билетов для админа
function setTicketsAmount(amount) {
    const input = document.getElementById('tickets-amount');
    input.value = Math.max(1, Math.min(1000, amount));
}

// Подтверждение действия с билетами
async function confirmTicketsAction(userId, action) {
    const amount = parseInt(document.getElementById('tickets-amount').value);
    
    if (amount <= 0 || amount > 1000) {
        showNotification('Некорректное количество билетов', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/user-tickets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                action: action,
                amount: amount
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Билеты успешно ${action === 'add' ? 'начислены' : 'списаны'}`, 'success');
            closeModal();
        } else {
            showNotification(data.message || 'Ошибка операции', 'error');
        }
    } catch (error) {
        console.error('Ошибка операции с билетами:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    }
}

// Бан пользователя
async function banUser(userId) {
    if (!confirm(`Вы уверены, что хотите забанить пользователя ${userId}?`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/ban-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Пользователь забанен', 'success');
            closeModal();
        } else {
            showNotification(data.message || 'Ошибка бана', 'error');
        }
    } catch (error) {
        console.error('Ошибка бана пользователя:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    }
}

// Разбан пользователя
async function unbanUser(userId) {
    try {
        const response = await fetch('/api/admin/unban-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Пользователь разбанен', 'success');
            closeModal();
        } else {
            showNotification(data.message || 'Ошибка разбана', 'error');
        }
    } catch (error) {
        console.error('Ошибка разбана пользователя:', error);
        showNotification('Ошибка подключения к серверу', 'error');
    }
}

// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ

// Показать модальное окно
function showModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

// Закрыть модальное окно
function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

// Показать/скрыть загрузочный экран
function showLoading(show) {
    const loadingScreen = document.getElementById('loading-screen');
    const mainPage = document.getElementById('main-page');
    
    if (show) {
        loadingScreen.classList.remove('hidden');
        mainPage.classList.add('hidden');
    } else {
        loadingScreen.classList.add('hidden');
        mainPage.classList.remove('hidden');
    }
}

// Показать уведомление
function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications-container');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Автоматическое удаление через 3 секунды
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Переключение темы
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.textContent = currentTheme === 'light' ? '🌙' : '☀️';
    
    // Сохраняем тему
    localStorage.setItem('theme', currentTheme);
}

// Загрузка темы
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        currentTheme = savedTheme;
        document.documentElement.setAttribute('data-theme', currentTheme);
        
        const themeToggle = document.getElementById('theme-toggle');
        themeToggle.textContent = currentTheme === 'light' ? '🌙' : '☀️';
    }
}

// Обновление информации о пользователе
function updateUserInfo() {
    if (currentUser) {
        document.getElementById('profile-name').textContent = 
            `${currentUser.first_name} ${currentUser.last_name || ''}`.trim();
        document.getElementById('profile-id').textContent = `ID: ${currentUser.id}`;
        
        const initials = (currentUser.first_name[0] + (currentUser.last_name?.[0] || '')).toUpperCase();
        document.getElementById('profile-initials').textContent = initials;
    }
}

// Обновление баланса
function updateUserBalance(balance) {
    document.getElementById('user-balance').textContent = balance || 0;
    userStats.balance = balance || 0;
}

// Получение медали для места
function getPlaceMedal(place) {
    const placeNum = parseInt(place);
    if (placeNum === 1) return '🥇';
    if (placeNum === 2) return '🥈';
    if (placeNum === 3) return '🥉';
    return '🏅';
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Debounce функция
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Загрузка админской статистики
async function loadAdminStatistics() {
    try {
        const response = await fetch('/api/admin/statistics');
        const data = await response.json();
        
        if (data.success) {
            displayDetailedStats(data.statistics);
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Отображение детальной статистики
function displayDetailedStats(stats) {
    const container = document.getElementById('detailed-stats');
    
    container.innerHTML = `
        <div class="stats-section">
            <h4>📊 Общая статистика</h4>
            <div class="stats-list">
                <div class="stat-row">
                    <span>Всего пользователей:</span>
                    <span>${stats.total_users}</span>
                </div>
                <div class="stat-row">
                    <span>Активных пользователей:</span>
                    <span>${stats.active_users}</span>
                </div>
                <div class="stat-row">
                    <span>Заблокированных:</span>
                    <span>${stats.banned_users}</span>
                </div>
            </div>
        </div>
        
        <div class="stats-section">
            <h4>🎁 Розыгрыши</h4>
            <div class="stats-list">
                <div class="stat-row">
                    <span>Активные розыгрыши:</span>
                    <span>${stats.active_giveaways}</span>
                </div>
                <div class="stat-row">
                    <span>Завершенные:</span>
                    <span>${stats.completed_giveaways}</span>
                </div>
                <div class="stat-row">
                    <span>Всего билетов выдано:</span>
                    <span>${stats.total_tickets}</span>
                </div>
            </div>
        </div>
        
        <div class="stats-section">
            <h4>📈 Активность</h4>
            <div class="stats-list">
                <div class="stat-row">
                    <span>Средний баланс:</span>
                    <span>${stats.average_balance} билетов</span>
                </div>
                <div class="stat-row">
                    <span>Всего рефералов:</span>
                    <span>${stats.total_referrals}</span>
                </div>
                <div class="stat-row">
                    <span>Активность сегодня:</span>
                    <span>${stats.today_activity}</span>
                </div>
            </div>
        </div>
    `;
}
