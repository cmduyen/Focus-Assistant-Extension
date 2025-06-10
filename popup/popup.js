document.addEventListener('DOMContentLoaded', () => {
    const headerFocusToggle = document.getElementById('headerFocusToggle'); // Toggle switch mới

    const pomodoroTimerEl = document.getElementById('pomodoroTimer');
    const pomodoroStatusEl = document.getElementById('pomodoroStatus');
    const pomodoroDurationInput = document.getElementById('pomodoroDuration');
    const startPomodoroBtn = document.getElementById('startPomodoro');
    const stopPomodoroBtn = document.getElementById('stopPomodoro');
    const openOptionsPageLink = document.getElementById('openOptionsPage');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const langToggleBtn = document.getElementById('langToggleBtn');
    const openInfoPageLink = document.getElementById('openInfoPage');
    // Elements cho Quick Block
    const quickBlockUrlInput = document.getElementById('quickBlockUrl');
    const quickBlockBtn = document.getElementById('quickBlockBtn');
    const quickBlockStatusEl = document.getElementById('quickBlockStatus'); // Note: This element is not in the provided popup.html
    const quickBlockedSitesListEl = document.getElementById('quickBlockedSitesList');

    let currentPomodoroInterval = null;
    let currentTheme = 'light'; // Mặc định là light
    let currentLang = 'vi'; // Mặc định là Tiếng Việt

    const translations = {
        en: {
            popupTitle: "Focus Assistant",
            themeToggleTitleLight: "Switch to Dark Mode",
            themeToggleTitleDark: "Switch to Light Mode",
            langToggleTitleVI: "Switch to English",
            langToggleTitleEN: "Switch to Vietnamese",
            focusModeHeader: "Focus Mode",
            statusLabel: "Status",
            statusLoading: "Loading...",
            statusOn: "ON",
            statusOff: "OFF",
            toggleFocusDefault: "Toggle",
            toggleFocusOn: "Turn Focus Mode ON",
            toggleFocusOff: "Turn Focus Mode OFF",
            strictModeTooltipFocus: "Strict Mode is ON. You cannot turn off Focus Mode during the current session.",
            pomodoroHeader: "Pomodoro Timer",
            pomodoroStatusDefault: "Not started",
            pomodoroStatusRunning: "Running... (ends at {time})",
            pomodoroDurationLabel: "Duration (minutes):",
            startPomodoro: "Start Pomodoro",
            stopPomodoro: "Stop Pomodoro",
            strictModeTooltipPomodoro: "Strict Mode is ON. You cannot stop Pomodoro.",
            pomodoroAlertPositive: "Pomodoro duration must be greater than 0.",
            openOptionsLink: "Settings",
            openOptionsLinkTitle: "Open Settings Page",
            openInfoLink: "Help & Info",
            openInfoLinkTitle: "View help, user information, and other products",
            quickBlockHeader: "Quick Block Site",
            quickBlockPlaceholder: "e.g., example.com",
            quickBlockButton: "Add",
            quickBlockSuccess: "Site '{site}' added to block list!",
            quickBlockErrorInvalid: "Invalid URL format.",
            quickBlockErrorExists: "Site '{site}' is already blocked.",
            removeButton: "Remove",
            quickBlockedSitesEmpty: "No sites blocked yet."
        }

        ,
        vi: {
            popupTitle: "Focus Assistant",
            themeToggleTitleLight: "Chuyển sang Giao diện Tối",
            themeToggleTitleDark: "Chuyển sang Giao diện Sáng",
            langToggleTitleVI: "Chuyển sang Tiếng Anh",
            langToggleTitleEN: "Chuyển sang Tiếng Việt",
            focusModeHeader: "Chế độ Tập trung",
            statusLabel: "Trạng thái",
            statusLoading: "Đang tải...",
            statusOn: "BẬT",
            statusOff: "TẮT",
            toggleFocusDefault: "Bật/Tắt",
            toggleFocusOn: "Bật Chế độ Tập trung",
            toggleFocusOff: "Tắt Chế độ Tập trung",
            strictModeTooltipFocus: "Strict Mode đang BẬT. Bạn không thể tắt Chế độ Tập trung trong phiên làm việc hiện tại.",
            pomodoroHeader: "Hẹn giờ Pomodoro",
            pomodoroStatusDefault: "Chưa bắt đầu",
            pomodoroStatusRunning: "Đang chạy... (kết thúc lúc {time})",
            pomodoroDurationLabel: "Thời gian (phút):",
            startPomodoro: "Bắt đầu Pomodoro",
            stopPomodoro: "Dừng Pomodoro",
            strictModeTooltipPomodoro: "Strict Mode đang BẬT. Bạn không thể dừng Pomodoro.",
            pomodoroAlertPositive: "Thời gian Pomodoro phải lớn hơn 0.",
            openOptionsLink: "Tùy chọn",
            openOptionsLinkTitle: "Mở trang Tùy chọn",
            openInfoLink: "Trợ giúp & Thông tin",
            openInfoLinkTitle: "Xem hướng dẫn, thông tin và các sản phẩm khác",
            quickBlockHeader: "Chặn nhanh trang web",
            quickBlockPlaceholder: "ví dụ: example.com",
            quickBlockButton: "Thêm",
            quickBlockSuccess: "Trang '{site}' đã được thêm vào danh sách chặn!",
            quickBlockErrorInvalid: "Định dạng URL không hợp lệ.",
            quickBlockErrorExists: "Trang '{site}' đã có trong danh sách chặn.",
            removeButton: "Xóa",
            quickBlockedSitesEmpty: "Chưa có trang nào bị chặn."
        }
    };

    // --- QUẢN LÝ GIAO DIỆN (THEME) ---
    function applyTheme(theme) {
        document.body.classList.remove('theme-light', 'theme-dark');

        document.body.classList.add(`theme-${theme}`);
        themeToggleBtn.textContent = theme === 'light' ? '🌙' : '☀️'; // Mặt trăng cho light, mặt trời cho dark
        currentTheme = theme;
        themeToggleBtn.title = translations[currentLang][theme === 'light' ? 'themeToggleTitleLight' : 'themeToggleTitleDark'];
    }

    themeToggleBtn.addEventListener('click', () => {
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        chrome.storage.sync.set({
            theme: newTheme
        }

            , () => {
                applyTheme(newTheme);
            }

        );
    }

    );

    // --- QUẢN LÝ NGÔN NGỮ ---
    function applyLanguage(lang) {
        currentLang = lang;
        document.documentElement.lang = lang; // Set lang attribute on <html>

        document.querySelectorAll('[data-lang-key]').forEach(el => {
            const key = el.dataset.langKey;

            if (translations[lang] && translations[lang][key]) {
                el.textContent = translations[lang][key];
            }
        }

        );

        langToggleBtn.textContent = lang === 'vi' ? '🇻🇳' : '🇬🇧';
        langToggleBtn.title = translations[lang][lang === 'vi' ? 'langToggleTitleVI' : 'langToggleTitleEN'];
        // Update theme button title as it also depends on language
        themeToggleBtn.title = translations[lang][currentTheme === 'light' ? 'themeToggleTitleLight' : 'themeToggleTitleDark'];
        openOptionsPageLink.title = translations[lang].openOptionsLinkTitle;
        openInfoPageLink.title = translations[lang].openInfoLinkTitle;
        // Re-apply dynamic texts that might have been set by updateUI
        loadSettings(); // This will call updateUI which should now use the new currentLang
    }

    langToggleBtn.addEventListener('click', () => {
        const newLang = currentLang === 'vi' ? 'en' : 'vi';

        chrome.storage.sync.set({
            lang: newLang
        }

            , () => {
                applyLanguage(newLang);
            }

        );
    }

    );

    function loadInitialState() {
        chrome.storage.sync.get(['theme', 'lang'], (result) => {
            let themeToApply = result.theme;
            let langToApply = result.lang;
            let settingsToSave = {};
            let defaultsDetected = false;

            if (!themeToApply) {
                // Phát hiện giao diện hệ thống
                if (window.matchMedia) { // Kiểm tra trình duyệt có hỗ trợ không
                    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    themeToApply = systemPrefersDark ? 'dark' : 'light';
                } else {
                    themeToApply = 'light'; // Mặc định nếu không phát hiện được
                }
                settingsToSave.theme = themeToApply;
                defaultsDetected = true;
            }

            if (!langToApply) {
                // Phát hiện ngôn ngữ trình duyệt
                const browserLang = (navigator.language || 'en').toLowerCase(); // Mặc định 'en' nếu không có
                langToApply = browserLang.startsWith('vi') ? 'vi' : 'en'; // Ưu tiên Tiếng Việt nếu trình duyệt là 'vi'
                settingsToSave.lang = langToApply;
                defaultsDetected = true;
            }

            if (defaultsDetected) {
                // Lưu các cài đặt mặc định phát hiện được. Listener onChanged sẽ xử lý việc áp dụng chúng.
                chrome.storage.sync.set(settingsToSave, () => {
                    console.log('System default theme/lang set in storage:', settingsToSave);
                });
            } else {
                // Giao diện và ngôn ngữ đã có trong storage, áp dụng trực tiếp và tải các cài đặt khác.
                currentTheme = themeToApply;
                currentLang = langToApply;
                applyTheme(currentTheme);
                applyLanguage(currentLang); // Hàm này đã gọi loadSettings()
            }
        });
    }

    loadInitialState();

    // --- KHỞI TẠO VÀ CẬP NHẬT UI ---
    function updateUI(settings) {

        // Cập nhật trạng thái Chế độ Tập trung
        if (settings.isFocusModeActive) {
            headerFocusToggle.checked = true; // Cập nhật trạng thái toggle switch mới
        }

        else {
            headerFocusToggle.checked = false; // Cập nhật trạng thái toggle switch mới
        }

        // Logic Strict Mode cho nút bật/tắt chế độ tập trung
        const isPomodoroActive = settings.pomodoro && settings.pomodoro.isActive && settings.pomodoro.endTime > Date.now();
        const activeSchedule = getActiveSchedule(settings.schedules || []); // Cần hàm getActiveSchedule ở đây

        if (settings.isStrictModActive && (isPomodoroActive || activeSchedule)) {
            headerFocusToggle.disabled = true; // Áp dụng cho toggle switch mới
            headerFocusToggle.parentElement.title = translations[currentLang].strictModeTooltipFocus; // Đặt title cho label bao ngoài
        }

        else {
            headerFocusToggle.disabled = false; // Áp dụng cho toggle switch mới
            headerFocusToggle.parentElement.title = settings.isFocusModeActive ? translations[currentLang].toggleFocusOff : translations[currentLang].toggleFocusOn;
        }

        // Cập nhật Pomodoro
        if (settings.pomodoro && settings.pomodoro.isActive && settings.pomodoro.endTime > Date.now()) {
            startPomodoroBtn.classList.add('hidden');
            stopPomodoroBtn.classList.remove('hidden');
            pomodoroDurationInput.disabled = true;
            pomodoroStatusEl.textContent = translations[currentLang].pomodoroStatusRunning.replace('{time}', new Date(settings.pomodoro.endTime).toLocaleTimeString());

            if (settings.isStrictModActive) {
                stopPomodoroBtn.disabled = true;
                stopPomodoroBtn.title = translations[currentLang].strictModeTooltipPomodoro;
            }

            else {
                stopPomodoroBtn.disabled = false;
                stopPomodoroBtn.title = "";
            }

            // Ensure button texts are updated according to language
            startPomodoroBtn.textContent = translations[currentLang].startPomodoro;
            stopPomodoroBtn.textContent = translations[currentLang].stopPomodoro;
            updatePomodoroCountdown(settings.pomodoro.endTime);
        }

        else {
            startPomodoroBtn.classList.remove('hidden');
            stopPomodoroBtn.classList.add('hidden');
            pomodoroDurationInput.disabled = false;
            pomodoroStatusEl.textContent = translations[currentLang].pomodoroStatusDefault;
            pomodoroTimerEl.textContent = '--:--';
            startPomodoroBtn.textContent = translations[currentLang].startPomodoro;
            stopPomodoroBtn.textContent = translations[currentLang].stopPomodoro;

            if (currentPomodoroInterval) {
                clearInterval(currentPomodoroInterval);
                currentPomodoroInterval = null;
            }
        }

        if (settings.pomodoro && settings.pomodoro.duration) {
            pomodoroDurationInput.value = settings.pomodoro.duration;
        }

        // Update static texts that might not be covered by initial applyLanguage if their keys were not on the element yet
        // Cập nhật placeholder cho quick block input
        if (quickBlockUrlInput) {
            quickBlockUrlInput.placeholder = translations[currentLang].quickBlockPlaceholder;
        }

        // Render danh sách chặn nhanh
        renderQuickBlockedSitesList(settings.blockedSites || []);
    }

    function updatePomodoroCountdown(endTime) {
        if (currentPomodoroInterval) {
            clearInterval(currentPomodoroInterval);
        }

        currentPomodoroInterval = setInterval(() => {
            const now = Date.now();
            const timeLeft = Math.max(0, endTime - now); // ms

            if (timeLeft === 0) {
                pomodoroTimerEl.textContent = '00:00';
                // Trạng thái sẽ được cập nhật bởi storage.onChanged khi background xử lý xong
                clearInterval(currentPomodoroInterval);
                currentPomodoroInterval = null;
                return;
            }

            const minutes = Math.floor(timeLeft / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            pomodoroTimerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

            , 1000);
    }

    // Hàm trợ giúp
    function getActiveSchedule(schedules) {
        if (!schedules || schedules.length === 0) return null;
        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = now.getHours() * 100 + now.getMinutes();
        const dayMapping = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const currentDayStr = dayMapping[currentDay];

        for (const schedule of schedules) {
            if (!schedule.isActive || !schedule.days || !schedule.startTime || !schedule.endTime) continue;

            if (schedule.days.includes(currentDayStr)) {
                const [startH, startM] = schedule.startTime.split(':').map(Number);
                const [endH, endM] = schedule.endTime.split(':').map(Number);
                const scheduleStart = startH * 100 + startM;
                const scheduleEnd = endH * 100 + endM;

                if (currentTime >= scheduleStart && currentTime < scheduleEnd) {
                    return schedule;
                }
            }
        }

        return null;
    }

    // --- TƯƠNG TÁC VỚI STORAGE ---
    function loadSettings() {
        chrome.storage.sync.get(['isFocusModeActive',
            'pomodoro',
            'schedules',
            'isStrictModActive'

        ], (result) => {

            // Kết hợp với theme và lang hiện tại để updateUI
            const fullSettings = {
                ...result,
                theme: currentTheme, // Đảm bảo theme hiện tại được truyền đi
                lang: currentLang // Đảm bảo lang hiện tại được truyền đi
            }

                ;
            updateUI(fullSettings);
        }

        );
    }

    // Lắng nghe thay đổi từ background hoặc các trang khác
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
            let settingsLoadedDueToLangChange = false;
            if (changes.theme) {
                applyTheme(changes.theme.newValue); // currentTheme được cập nhật bên trong applyTheme
            }
            if (changes.lang) {
                applyLanguage(changes.lang.newValue); // currentLang được cập nhật bên trong applyLanguage, hàm này cũng gọi loadSettings
                settingsLoadedDueToLangChange = true;
            }

            // Chỉ gọi loadSettings nếu nó chưa được gọi bởi applyLanguage
            // để cập nhật các phần UI khác có thể phụ thuộc vào theme hoặc các cài đặt khác đã thay đổi.
            if (!settingsLoadedDueToLangChange) {
                loadSettings();
            }
        }
    });

    // Xử lý sự kiện cho toggle switch mới ở header
    headerFocusToggle.addEventListener('change', async () => {
        const {
            isFocusModeActive, isStrictModActive, pomodoro, schedules
        }

            = await chrome.storage.sync.get(['isFocusModeActive', 'isStrictModActive', 'pomodoro', 'schedules'
            ]);

        const isPomodoroSessionActive = pomodoro && pomodoro.isActive && pomodoro.endTime > Date.now();
        const activeSchedule = getActiveSchedule(schedules || []);

        if (isStrictModActive && (isPomodoroSessionActive || activeSchedule) && isFocusModeActive) {
            alert(translations[currentLang].strictModeTooltipFocus);
            return;
        }

        chrome.storage.sync.set({
            isFocusModeActive: headerFocusToggle.checked // Lấy trạng thái từ checkbox
        }

        );
        // UI sẽ tự cập nhật qua listener `chrome.storage.onChanged`
    }

    );

    startPomodoroBtn.addEventListener('click', () => {
        const duration = parseInt(pomodoroDurationInput.value, 10);

        if (duration > 0) {

            // Gửi yêu cầu bắt đầu Pomodoro tới background script
            chrome.runtime.sendMessage({
                action: "startPomodoro", duration: duration
            }

                , response => {
                    if (chrome.runtime.lastError) {
                        console.error("Error sending startPomodoro message:", chrome.runtime.lastError.message);
                    }

                    else {
                        console.log("Start Pomodoro request sent.");
                    }
                }

            );

        }

        else {
            alert(translations[currentLang].pomodoroAlertPositive);
        }
    }

    );

    stopPomodoroBtn.addEventListener('click', async () => {
        const {
            isStrictModActive, pomodoro
        }

            = await chrome.storage.sync.get(['isStrictModActive', 'pomodoro']);

        if (isStrictModActive && pomodoro.isActive) {
            alert(translations[currentLang].strictModeTooltipPomodoro);
            return;
        }

        chrome.runtime.sendMessage({
            action: "stopPomodoro"
        }

            , response => {
                if (chrome.runtime.lastError) {
                    console.error("Error sending stopPomodoro message:", chrome.runtime.lastError.message);
                }

                else {
                    console.log("Stop Pomodoro request sent.");
                }
            }

        );
    }

    );

    // Mở trang tùy chọn
    openOptionsPageLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    }

    );

    openInfoPageLink.addEventListener('click', (e) => {
        e.preventDefault();

        const infoPagePath = `/info/info_${currentTheme}_${currentLang}.html`;
        chrome.tabs.create({
            url: chrome.runtime.getURL(infoPagePath)
        }

        );
    }

    );

    // --- XỬ LÝ QUICK BLOCK ---
    if (quickBlockBtn) {
        quickBlockBtn.addEventListener('click', async () => {
            const url = quickBlockUrlInput.value.trim().toLowerCase();
            if (quickBlockStatusEl) quickBlockStatusEl.textContent = ''; // Xóa thông báo cũ

            if (!url) {
                quickBlockUrlInput.focus();
                return;
            }

            try {
                let domain = url;
                // Tự động trích xuất hostname và loại bỏ 'www.'
                if (url.includes('://')) {
                    try {
                        domain = new URL(url).hostname;
                    } catch (e) {
                        // Nếu URL không hợp lệ, thử xử lý như một domain đơn giản
                    }
                }
                domain = domain.replace(/^www\./i, '');
                // Chỉ lấy phần domain, không lấy path hoặc query params
                domain = domain.split('/')[0].split('?')[0];

                // Regex kiểm tra định dạng domain cơ bản (sau khi đã cố gắng chuẩn hóa)
                if (!domain || !/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}$/i.test(domain)) {
                    // Kiểm tra domain cơ bản, không kiểm tra path
                    if (quickBlockStatusEl) quickBlockStatusEl.textContent = translations[currentLang].quickBlockErrorInvalid;
                    return;
                }


                const {
                    blockedSites = []
                }

                    = await chrome.storage.sync.get('blockedSites');

                if (blockedSites.includes(domain)) {
                    if (quickBlockStatusEl) quickBlockStatusEl.textContent = translations[currentLang].quickBlockErrorExists.replace('{site}', domain);
                }

                else {
                    const newBlockedSites = [...blockedSites, domain];

                    await chrome.storage.sync.set({
                        blockedSites: newBlockedSites
                    }

                    );
                    if (quickBlockStatusEl) quickBlockStatusEl.textContent = translations[currentLang].quickBlockSuccess.replace('{site}', domain);
                    quickBlockUrlInput.value = ''; // Xóa input sau khi thêm
                }
            }

            catch (e) {
                console.error("Error in quick block:", e);
                if (quickBlockStatusEl) quickBlockStatusEl.textContent = translations[currentLang].quickBlockErrorInvalid;
            }

            // Tự động xóa thông báo sau vài giây
            if (quickBlockStatusEl) {
                setTimeout(() => {
                    if (quickBlockStatusEl) quickBlockStatusEl.textContent = '';
                }
                    , 3000);
            }
        }

        );
    }

    // --- RENDER DANH SÁCH CHẶN NHANH ---
    function renderQuickBlockedSitesList(sites) {
        if (!quickBlockedSitesListEl) return;
        quickBlockedSitesListEl.innerHTML = ''; // Xóa danh sách cũ

        if (!sites || sites.length === 0) {
            return;
        }

        sites.forEach(site => {
            const li = document.createElement('li');
            li.textContent = site;

            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '&times;'; // Ký tự 'x'
            removeBtn.title = translations[currentLang].removeButton;
            removeBtn.classList.add('remove-site-btn');

            removeBtn.addEventListener('click', () => {
                removeQuickBlockedSite(site);
            }

            );

            li.appendChild(removeBtn);
            quickBlockedSitesListEl.appendChild(li);
        }

        );
    }

    async function removeQuickBlockedSite(siteToRemove) {
        const {
            blockedSites = []
        }

            = await chrome.storage.sync.get('blockedSites');
        const newBlockedSites = blockedSites.filter(site => site !== siteToRemove);

        await chrome.storage.sync.set({
            blockedSites: newBlockedSites
        }

        );
        // UI sẽ tự cập nhật qua listener `chrome.storage.onChanged` -> `loadSettings` -> `updateUI` -> `renderQuickBlockedSitesList`
    }

    // Tải cài đặt ban đầu (đã được gọi bởi loadInitialState)
    // loadSettings();
}
);