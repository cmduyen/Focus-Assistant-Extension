document.addEventListener('DOMContentLoaded', () => {
    // --- Elements cho Danh sách Chặn ---
    const newSiteUrlInput = document.getElementById('newSiteUrl');
    const addSiteBtn = document.getElementById('addSiteBtn');
    const blockedSitesListEl = document.getElementById('blockedSitesList');

    // --- Elements cho Lịch trình ---
    const schedulesListEl = document.getElementById('schedulesList');
    const daysOfWeekContainer = document.getElementById('daysOfWeek');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const addScheduleBtn = document.getElementById('addScheduleBtn');

    // --- Elements cho Strict Mode ---
    const strictModeToggle = document.getElementById('strictModeToggle');
    const strictModeStatusEl = document.getElementById('strictModeStatus');

    let currentSettings = {}
    let currentLang = 'vi'; // Mặc định

    const optionTranslations = {
        en: {
            optionsTitle: "Focus Assistant Settings",
            manageBlockedSitesHeader: "Manage Blocked Sites",
            addSitePlaceholder: "e.g., youtube.com",
            addSiteButton: "Add Site",
            blockedSitesEmpty: "No sites blocked yet.",
            removeButton: "Remove",
            urlFormatError: "Invalid URL format. Please enter domain name only (e.g., example.com).",
            siteExistsError: "This website is already in the block list.",
            noteDomainOnly: "Note: Enter domain name only (e.g., `facebook.com`, not `https://www.facebook.com/somepage`).",
            schedulesHeader: "Automatic Blocking Schedules",
            schedulesEmpty: "No schedules yet.",
            addScheduleHeader: "Add New Schedule",
            selectDaysLabel: "Select days of the week:",
            dayMon: "Mon",
            dayTue: "Tue",
            dayWed: "Wed",
            dayThu: "Thu",
            dayFri: "Fri",
            daySat: "Sat",
            daySun: "Sun",
            timeFromLabel: "From:",
            timeToLabel: "To:",
            addScheduleButton: "Add Schedule",
            errorSelectDay: "Please select at least one day of the week.",
            errorSelectTime: "Please select start and end times.",
            errorStartTimeBeforeEndTime: "Start time must be before end time.",
            advancedSettingsHeader: "Advanced Settings",
            strictModeLabel: "Strict Mode:",
            statusOn: "ON",
            statusOff: "OFF",
            strictModeNote: "When ON, you cannot turn off focus mode or change the block list during an active Pomodoro session or schedule."
        },
        vi: {
            optionsTitle: "Tùy chọn Focus Assistant",
            manageBlockedSitesHeader: "Quản lý Danh sách Chặn",
            addSitePlaceholder: "ví dụ: youtube.com",
            addSiteButton: "Thêm Trang",
            blockedSitesEmpty: "Chưa có trang nào bị chặn.",
            removeButton: "Xóa",
            urlFormatError: "Định dạng URL không hợp lệ. Vui lòng chỉ nhập tên miền (ví dụ: example.com).",
            siteExistsError: "Trang web này đã có trong danh sách chặn.",
            noteDomainOnly: "Lưu ý: Chỉ nhập tên miền (ví dụ: `facebook.com`, không phải `https://www.facebook.com/somepage`).",
            schedulesHeader: "Lên lịch Chặn Tự động",
            schedulesEmpty: "Chưa có lịch trình nào.",
            addScheduleHeader: "Thêm Lịch trình Mới",
            selectDaysLabel: "Chọn ngày trong tuần:",
            dayMon: "T2", dayTue: "T3", dayWed: "T4", dayThu: "T5", dayFri: "T6", daySat: "T7", daySun: "CN",
            timeFromLabel: "Từ:",
            timeToLabel: "Đến:",
            addScheduleButton: "Thêm Lịch trình",
            errorSelectDay: "Vui lòng chọn ít nhất một ngày trong tuần.",
            errorSelectTime: "Vui lòng chọn thời gian bắt đầu và kết thúc.",
            errorStartTimeBeforeEndTime: "Thời gian bắt đầu phải trước thời gian kết thúc.",
            advancedSettingsHeader: "Cài đặt Nâng cao",
            strictModeLabel: "Chế độ Nghiêm ngặt (Strict Mode):",
            statusOn: "BẬT", statusOff: "TẮT",
            strictModeNote: "Khi BẬT, bạn không thể tắt chế độ chặn hoặc thay đổi danh sách chặn trong phiên Pomodoro hoặc lịch trình đang diễn ra."
        }
    };

    // --- QUẢN LÝ GIAO DIỆN (THEME) ---
    function applyTheme(theme) {
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add(`theme-${theme}`);
    }

    function loadAndApplyTheme() {
        chrome.storage.sync.get('theme', (result) => {
            const savedTheme = result.theme || 'light'; // Mặc định là light nếu chưa có
            applyTheme(savedTheme);
        }
        );
    }

    // --- QUẢN LÝ NGÔN NGỮ ---
    function applyOptionsLanguage(lang) {
        currentLang = lang;
        document.documentElement.lang = lang;
        document.querySelectorAll('[data-lang-key]').forEach(el => {
            const key = el.dataset.langKey;
            if (optionTranslations[lang] && optionTranslations[lang][key]) {
                if (el.tagName === 'INPUT' && el.type === 'text' && el.placeholder) {
                    el.placeholder = optionTranslations[lang][key];
                } else {
                    el.textContent = optionTranslations[lang][key];
                }
            }
        });
        // Cập nhật các nút chọn ngày
        daysOfWeekContainer.querySelectorAll('button').forEach(btn => {
            const dayLangKey = btn.dataset.langKeyDay; // Sử dụng data-lang-key-day
            if (dayLangKey && optionTranslations[lang] && optionTranslations[lang][dayLangKey]) btn.textContent = optionTranslations[lang][dayLangKey];
        });
    }

    // --- Tải và Hiển thị Cài đặt ---
    function loadSettings() {
        chrome.storage.sync.get(['blockedSites',
            'schedules',
            'isStrictModActive',
            'theme', 'lang', // Tải cả theme và lang setting
            'pomodoro', // Cần pomodoro để kiểm tra Strict Mode
            'isFocusModeActive' // Cần để kiểm tra Strict Mode

        ], (result) => {
            // DEBUG: Kiểm tra giá trị đọc được từ storage khi trang Tùy chọn tải lần đầu
            console.log('Options Page - Initial Settings Loaded:', JSON.stringify(result));
            currentSettings = result; // Lưu lại để dùng sau

            // 1. Áp dụng ngôn ngữ TRƯỚC để currentLang được cập nhật chính xác
            applyOptionsLanguage(result.lang || 'vi');

            // 2. Áp dụng theme
            applyTheme(result.theme || 'light');

            // 3. Bây giờ render các phần còn lại của UI, sử dụng currentLang đã được cập nhật
            // Hiển thị danh sách chặn
            renderBlockedSites(result.blockedSites || []);
            // Hiển thị lịch trình
            renderSchedules(result.schedules || []);

            // Hiển thị trạng thái Strict Mode (sử dụng currentLang đã được cập nhật)
            const strictModeOn = result.isStrictModActive || false;
            strictModeToggle.checked = strictModeOn;
            strictModeStatusEl.textContent = optionTranslations[currentLang][strictModeOn ? 'statusOn' : 'statusOff'];
            strictModeStatusEl.className = strictModeOn ? 'status-on' : 'status-off';
            // Kiểm tra và vô hiệu hóa các control nếu Strict Mode đang hoạt động
            checkStrictModeAndDisableControls();
        }

        );
    }

    // Lắng nghe thay đổi từ background hoặc các trang khác (quan trọng cho Strict Mode)
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
            if (changes.lang) {
                applyOptionsLanguage(changes.lang.newValue);
            }
            if (changes.theme) {
                applyTheme(changes.theme.newValue);
            }
            // Tải lại toàn bộ cài đặt để cập nhật UI và trạng thái Strict Mode
            loadSettings();
        }
    }
    );

    // --- QUẢN LÝ DANH SÁCH CHẶN ---
    function renderBlockedSites(sites) {
        blockedSitesListEl.innerHTML = ''; // Xóa danh sách cũ
        if (!sites || sites.length === 0) {
            const li = document.createElement('li');
            li.textContent = optionTranslations[currentLang].blockedSitesEmpty;
            li.className = 'empty-list';
            blockedSitesListEl.appendChild(li);
            return;
        }

        sites.forEach(site => {
            const li = document.createElement('li');
            li.textContent = site;
            const removeBtn = document.createElement('button');
            removeBtn.textContent = optionTranslations[currentLang].removeButton;
            removeBtn.classList.add('remove-btn');
            removeBtn.addEventListener('click', () => {
                removeBlockedSite(site);
            }
            );
            li.appendChild(removeBtn);
            blockedSitesListEl.appendChild(li);
        });
    }

    addSiteBtn.addEventListener('click', () => {
        const url = newSiteUrlInput.value.trim().toLowerCase();
        if (url) {
            // Đơn giản hóa URL: loại bỏ http(s):// và www. nếu có, và phần path
            try {
                let domain = url;
                // Tự động trích xuất hostname và loại bỏ 'www.'
                if (url.includes('://')) {
                    try {
                        domain = new URL(url).hostname;
                    } catch (e) {
                        // Bỏ qua nếu URL không hợp lệ, để regex xử lý
                    }
                }
                domain = domain.replace(/^www\./i, ''); // Loại bỏ www.
                // Chỉ lấy phần domain, không lấy path hoặc query params
                domain = domain.split('/')[0].split('?')[0];

                // Regex kiểm tra định dạng domain cơ bản
                if (!domain || !/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}$/i.test(domain)) {
                    throw new Error("Invalid URL format");
                }
                chrome.storage.sync.get('blockedSites', (result) => {
                    const sites = result.blockedSites || [];
                    if (!sites.includes(domain)) {
                        sites.push(domain);

                        chrome.storage.sync.set({
                            blockedSites: sites
                        }
                            , () => {
                                newSiteUrlInput.value = '';
                                // UI sẽ tự cập nhật qua listener `chrome.storage.onChanged` hoặc gọi renderBlockedSites
                                renderBlockedSites(sites); // Cập nhật ngay để người dùng thấy
                            }
                        );
                    }
                    else {
                        alert(optionTranslations[currentLang].siteExistsError);
                    }
                }
                );
            }
            catch (e) {
                alert(optionTranslations[currentLang].urlFormatError);
            }
        }
    }
    );
    function removeBlockedSite(siteToRemove) {
        chrome.storage.sync.get('blockedSites', (result) => {
            const sites = (result.blockedSites || []).filter(site => site !== siteToRemove);

            chrome.storage.sync.set({
                blockedSites: sites
            }
                , () => {
                    renderBlockedSites(sites); // Cập nhật ngay
                }
            );
        }

        );
    }

    // --- QUẢN LÝ LỊCH TRÌNH ---
    function renderSchedules(schedules) {
        schedulesListEl.innerHTML = ''; // Xóa danh sách cũ
        if (!schedules || schedules.length === 0) {
            const p = document.createElement('p');
            p.textContent = optionTranslations[currentLang].schedulesEmpty;
            p.className = 'empty-list';
            schedulesListEl.appendChild(p);
            return;
        }

        schedules.forEach(schedule => {
            const div = document.createElement('div');
            div.className = 'schedule-item';
            div.innerHTML = ` <span>${schedule.days.join(', ')}: ${schedule.startTime} - ${schedule.endTime}</span>
                              <label class="switch"> 
                                <input type="checkbox" class="schedule-toggle" data-id="${schedule.id}" ${schedule.isActive ? 'checked' : ''}>
                                <span class="slider round"></span>
                              </label>
                              <button class="remove-schedule-btn" data-id="${schedule.id}">${optionTranslations[currentLang].removeButton}</button> `;
            schedulesListEl.appendChild(div);
        });

        // Gắn listener cho các nút mới tạo
        document.querySelectorAll('.remove-schedule-btn').forEach(btn => {
            btn.addEventListener('click', (e) => removeSchedule(e.target.dataset.id));
        });

        document.querySelectorAll('.schedule-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => toggleScheduleActive(e.target.dataset.id, e.target.checked));
        });
    }

    daysOfWeekContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            e.target.classList.toggle('selected');
        }
    }
    );

    addScheduleBtn.addEventListener('click', () => {
        const selectedDays = Array.from(daysOfWeekContainer.querySelectorAll('button.selected')).map(btn => btn.dataset.day);
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;
        if (selectedDays.length === 0) {
            alert(optionTranslations[currentLang].errorSelectDay);
            return;
        }
        if (!startTime || !endTime) {
            alert(optionTranslations[currentLang].errorSelectTime);
            return;
        }
        if (startTime >= endTime) {
            alert(optionTranslations[currentLang].errorStartTimeBeforeEndTime);
            return;
        }
        const newSchedule = {
            id: `schedule_${Date.now()}`, // ID duy nhất
            days: selectedDays,
            startTime: startTime,
            endTime: endTime,
            isActive: true // Mặc định là active khi mới tạo
        };
        chrome.storage.sync.get('schedules', (result) => {
            const schedules = result.schedules || [];
            schedules.push(newSchedule);
            chrome.storage.sync.set({
                schedules: schedules
            }
                , () => {
                    // Reset form
                    daysOfWeekContainer.querySelectorAll('button.selected').forEach(btn => btn.classList.remove('selected'));
                    startTimeInput.value = '';
                    endTimeInput.value = '';
                    renderSchedules(schedules); // Cập nhật UI
                }
            );
        }
        );
    }
    );

    function removeSchedule(scheduleId) {
        chrome.storage.sync.get('schedules', (result) => {
            const schedules = (result.schedules || []).filter(s => s.id !== scheduleId);
            chrome.storage.sync.set({
                schedules: schedules
            }
                , () => {
                    renderSchedules(schedules);
                }

            );
        });

    }

    function toggleScheduleActive(scheduleId, isActive) {
        chrome.storage.sync.get('schedules', (result) => {
            const schedules = (result.schedules || []).map(s => {
                if (s.id === scheduleId) {
                    return {
                        ...s, isActive: isActive
                    }
                };
                return s;
            }
            );
            chrome.storage.sync.set({
                schedules: schedules
            }
                , () => {
                    // Không cần render lại toàn bộ, chỉ cần cập nhật trạng thái nếu cần
                    // Hoặc cứ để storage.onChanged xử lý (nếu có)
                    // renderSchedules(schedules); // Hoặc để listener tự cập nhật
                }
            );
        }

        );
    }


    // --- QUẢN LÝ STRICT MODE ---
    strictModeToggle.addEventListener('change', () => {
        const isChecked = strictModeToggle.checked;
        chrome.storage.sync.set({
            isStrictModActive: isChecked
        }
            , () => {
                strictModeStatusEl.textContent = optionTranslations[currentLang][isChecked ? 'statusOn' : 'statusOff'];
                strictModeStatusEl.className = isChecked ? 'status-on' : 'status-off';
                // Sau khi thay đổi Strict Mode, kiểm tra lại các control
                checkStrictModeAndDisableControls();
            }
        );
    }
    );

    // --- LOGIC STRICT MODE CHO UI ---
    function getActiveSchedule(schedules) {
        // Hàm trợ giúp, có thể đưa ra ngoài nếu dùng ở nhiều nơi
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

    function checkStrictModeAndDisableControls() {
        const {
            isStrictModActive, pomodoro, schedules
        } = currentSettings;
        const isPomodoroSessionActive = pomodoro && pomodoro.isActive && pomodoro.endTime > Date.now();
        const activeSchedule = getActiveSchedule(schedules || []);
        const isSessionActive = isPomodoroSessionActive || activeSchedule;
        const shouldDisableSiteManagement = isStrictModActive && isSessionActive;
        // Vô hiệu hóa quản lý danh sách chặn
        newSiteUrlInput.disabled = shouldDisableSiteManagement;
        addSiteBtn.disabled = shouldDisableSiteManagement;
        blockedSitesListEl.querySelectorAll('.remove-btn').forEach(btn => {
            btn.disabled = shouldDisableSiteManagement;
            if (shouldDisableSiteManagement) btn.title = optionTranslations[currentLang].strictModeNote; // Hoặc một key cụ thể hơn
            else btn.title = "";
        }
        );
        if (shouldDisableSiteManagement) {
            const strictModeTitle = optionTranslations[currentLang].strictModeNote; // Hoặc một key cụ thể hơn
            newSiteUrlInput.title = strictModeTitle;
            addSiteBtn.title = strictModeTitle;
        }
        else {
            newSiteUrlInput.title = "";
            addSiteBtn.title = "";
        }

        // Vô hiệu hóa quản lý lịch trình (có thể không cần thiết bằng danh sách chặn)
        // Hiện tại, Strict Mode không cấm thay đổi lịch trình, chỉ cấm tắt chặn và sửa danh sách chặn.
        // Nếu muốn mở rộng:
        /*
    const shouldDisableScheduleManagement = isStrictModActive && isSessionActive;
    document.querySelectorAll('#schedulesList .remove-schedule-btn, #schedulesList .schedule-toggle').forEach(el => {
        el.disabled = shouldDisableScheduleManagement;
    });
    addScheduleBtn.disabled = shouldDisableScheduleManagement;
    daysOfWeekContainer.querySelectorAll('button').forEach(btn => btn.disabled = shouldDisableScheduleManagement);
    startTimeInput.disabled = shouldDisableScheduleManagement;
    endTimeInput.disabled = shouldDisableScheduleManagement;
    */
    }

    // Tải cài đặt ban đầu khi trang được mở
    loadSettings();
}
);