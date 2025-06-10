// background.js - Bộ não trung tâm của Focus Assistant

// ID quy tắc cơ sở cho declarativeNetRequest để tránh xung đột
const RULE_ID_OFFSET = 1000;
const POMODORO_ALARM_NAME = 'pomodoroEndAlarm';
const SCHEDULE_CHECK_ALARM_NAME = 'scheduleCheckAlarm';
const POMODORO_TICK_ALARM_NAME = 'pomodoroTickAlarm'; // Để cập nhật UI popup

// --- KHỞI TẠO VÀ LẮNG NGHE SỰ KIỆN ---

// Khởi tạo giá trị mặc định khi cài đặt extension
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get([
        'blockedSites',
        'isFocusModeActive',
        'pomodoro',
        'schedules',
        'isStrictModActive',
        'lang' // Thêm lang
    ], (result) => {
        // Danh sách các trang giải trí mặc định cần chặn
        const defaultBlockedSites = [
            "youtube.com",
            "facebook.com",
            "tiktok.com",
            "instagram.com",
            "netflix.com",
            "twitter.com", // Hoặc x.com tùy theo thời điểm
            "reddit.com"
        ];
        chrome.storage.sync.set({
            blockedSites: result.blockedSites && result.blockedSites.length > 0 ? result.blockedSites : defaultBlockedSites,
            isFocusModeActive: typeof result.isFocusModeActive === 'boolean' ? result.isFocusModeActive : false,
            pomodoro: result.pomodoro || { isActive: false, duration: 25, startTime: 0, endTime: 0 },
            schedules: result.schedules || [],
            isStrictModActive: typeof result.isStrictModActive === 'boolean' ? result.isStrictModActive : false,
            lang: result.lang || 'vi', // Mặc định là Tiếng Việt
        }, () => {
            console.log('Focus Assistant initialized.');
            updateBlockingRules();
            setupScheduledChecks(); // Thiết lập kiểm tra lịch trình định kỳ
        });
    });
});

// Lắng nghe thay đổi trong storage để cập nhật quy tắc chặn
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        let needsRuleUpdate = false;
        let needsScheduleCheckUpdate = false;

        // Nếu theme hoặc lang thay đổi, cũng cần cập nhật quy tắc chặn (vì trang chặn phụ thuộc vào chúng)
        if (changes.blockedSites || changes.isFocusModeActive || changes.pomodoro || changes.schedules || changes.theme || changes.lang) {
            needsRuleUpdate = true;
        }
        if (changes.schedules) { // Giữ nguyên, không liên quan trực tiếp đến theme/lang cho logic này
            needsScheduleCheckUpdate = true;
        }

        if (needsRuleUpdate) {
            console.log('Storage changed, updating blocking rules.');
            updateBlockingRules();
        }
        if (needsScheduleCheckUpdate) {
            setupScheduledChecks(); // Cập nhật lại alarm nếu lịch trình thay đổi
        }
    }
});

// Lắng nghe sự kiện từ alarms
chrome.alarms.onAlarm.addListener((alarm) => {
    console.log('Alarm triggered:', alarm.name);
    if (alarm.name === POMODORO_ALARM_NAME) {
        handlePomodoroEnd();
    } else if (alarm.name === SCHEDULE_CHECK_ALARM_NAME) {
        checkSchedulesAndApplyBlocking();
    } else if (alarm.name === POMODORO_TICK_ALARM_NAME) {
        // Chỉ dùng để báo cho popup cập nhật, không làm gì ở background
        // Nếu popup không mở, alarm này không cần thiết lắm
        // Nhưng vẫn giữ để đảm bảo popup có thể nhận tick nếu đang mở
    }
});

// Lắng nghe message từ popup hoặc options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startPomodoro" && typeof request.duration === 'number') {
        (async () => {
            try {
                console.log('Received startPomodoro request from popup.');
                await startPomodoro(request.duration);
                sendResponse({ success: true, message: "Pomodoro start initiated." });
            } catch (error) {
                console.error("Error processing startPomodoro:", error);
                sendResponse({ success: false, message: "Failed to start Pomodoro." });
            }
        })();
        return true; // Indicates you wish to send a response asynchronously
    } else if (request.action === "stopPomodoro") {
        (async () => {
            try {
                console.log('Received stopPomodoro request from popup.');
                await stopPomodoro(); // Hàm này đã có kiểm tra Strict Mode bên trong
                sendResponse({ success: true, message: "Pomodoro stop initiated." });
            } catch (error) {
                console.error("Error processing stopPomodoro:", error);
                sendResponse({ success: false, message: "Failed to stop Pomodoro." });
            }
        })();
        return true;
    }
    // Return false or undefined if you don't send a response synchronously and don't return true.
    // This indicates that the message channel can be closed.
    return false;
});


// --- QUẢN LÝ QUY TẮC CHẶN (declarativeNetRequest) ---

/**
 * Cập nhật các quy tắc chặn dựa trên trạng thái hiện tại.
 * Đây là hàm cốt lõi quyết định trang nào bị chặn.
 */
async function updateBlockingRules() {
    const { blockedSites, isFocusModeActive, pomodoro, schedules, isStrictModActive, theme, lang } = await chrome.storage.sync.get([
        'blockedSites',
        'isFocusModeActive',
        'pomodoro',
        'schedules',
        'isStrictModActive',
        'theme',
        'lang' // Lấy cài đặt ngôn ngữ hiện tại
    ]);

    const sitesToBlock = new Set(blockedSites || []);
    let shouldBlock = isFocusModeActive; // Chặn nếu chế độ thủ công BẬT

    // Kiểm tra Pomodoro
    if (pomodoro && pomodoro.isActive && pomodoro.endTime > Date.now()) {
        shouldBlock = true; // Chặn nếu Pomodoro đang chạy
    }

    // Kiểm tra Lịch trình
    const activeSchedule = getActiveSchedule(schedules || []);
    if (activeSchedule) {
        shouldBlock = true; // Chặn nếu có lịch trình đang hoạt động
    }

    // Lấy các quy tắc hiện có
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map(rule => rule.id);

    // Xác định trang chặn dựa trên theme và ngôn ngữ
    const currentTheme = theme || 'light'; // Mặc định là light nếu chưa có cài đặt
    const currentLang = lang || 'vi'; // Mặc định là vi nếu chưa có cài đặt
    const blockedPagePath = `/blocked_pages/blocked_${currentTheme}_${currentLang}.html`;

    if (shouldBlock && sitesToBlock.size > 0) {
        const newRules = [];
        let ruleIdCounter = RULE_ID_OFFSET;
        sitesToBlock.forEach(domain => {
            // Loại bỏ "www." nếu có để chặn cả hai
            const cleanedDomain = domain.replace(/^www\./i, '');
            newRules.push({
                id: ruleIdCounter++,
                priority: 1,
                action: { type: 'redirect', redirect: { extensionPath: blockedPagePath } },
                condition: {
                    // Chặn domain chính và tất cả subdomain
                    // Ví dụ: youtube.com sẽ chặn youtube.com, m.youtube.com, www.youtube.com
                    // Lưu ý: `urlFilter` không hỗ trợ regex đầy đủ, nó dùng một cú pháp riêng.
                    // Để chặn chính xác hơn, có thể cần nhiều quy tắc hoặc dùng `regexFilter` (phức tạp hơn).
                    // Ở đây dùng `resourceTypes` để đảm bảo chặn trang chính.
                    urlFilter: `||${cleanedDomain}/`, // Chặn domain và các đường dẫn con
                    resourceTypes: ['main_frame']
                }
            });
        });

        try {
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: existingRuleIds, // Xóa tất cả quy tắc cũ của extension
                addRules: newRules
            });
            console.log('Blocking rules updated. Sites blocked:', Array.from(sitesToBlock));
        } catch (error) {
            console.error('Error updating dynamic rules:', error);
        }
    } else {
        // Nếu không cần chặn, xóa tất cả quy tắc động của extension
        if (existingRuleIds.length > 0) {
            try {
                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: existingRuleIds
                });
                console.log('All blocking rules removed.');
            } catch (error) {
                console.error('Error removing dynamic rules:', error);
            }
        } else {
            console.log('No sites to block or focus mode is off. No rules active.');
        }
    }
}


// --- QUẢN LÝ POMODORO ---

/**
 * Bắt đầu một phiên Pomodoro.
 * @param {number} duration - Thời gian Pomodoro tính bằng phút.
 */
async function startPomodoro(duration) {
    const { isStrictModActive, pomodoro } = await chrome.storage.sync.get(['isStrictModActive', 'pomodoro']);

    // Nếu Strict Mode đang BẬT và đã có Pomodoro/Lịch trình đang chạy, không cho bắt đầu cái mới (hoặc chồng chéo)
    // Tuy nhiên, logic này thường được xử lý ở UI để không cho người dùng nhấn nút.
    // Ở đây, chúng ta cứ ghi đè Pomodoro hiện tại nếu có.

    const startTime = Date.now();
    const endTime = startTime + duration * 60 * 1000;

    await chrome.storage.sync.set({
        pomodoro: { isActive: true, duration, startTime, endTime },
        isFocusModeActive: true // Tự động bật chế độ tập trung
    });

    chrome.alarms.create(POMODORO_ALARM_NAME, { when: endTime });
    // Tạo alarm tick mỗi giây để popup có thể cập nhật (nếu đang mở)
    chrome.alarms.create(POMODORO_TICK_ALARM_NAME, { periodInMinutes: 1 / 60 });


    console.log(`Pomodoro started for ${duration} minutes. Ends at ${new Date(endTime)}`);
    updateBlockingRules(); // Cập nhật quy tắc chặn ngay lập tức
}

/**
 * Xử lý khi Pomodoro kết thúc.
 */
async function handlePomodoroEnd() {
    const { pomodoro, isStrictModActive, lang } = await chrome.storage.sync.get(['pomodoro', 'isStrictModActive', 'lang']);
    const currentLang = lang || 'vi';

    // Chỉ tắt focus mode nếu không có lịch trình nào đang hoạt động
    // và người dùng không bật thủ công trước đó (khó xác định, nên cứ tắt)
    const activeSchedule = getActiveSchedule((await chrome.storage.sync.get('schedules')).schedules || []);
    const notificationMessages = {
        en: "Pomodoro session has ended! You can take a break.",
        vi: "Phiên Pomodoro đã kết thúc! Bạn có thể nghỉ ngơi."
    };

    await chrome.storage.sync.set({
        pomodoro: { ...pomodoro, isActive: false },
        // Nếu không có lịch trình nào đang chạy, tắt focus mode
        // Nếu Strict Mode đang BẬT, nó sẽ được xử lý bởi logic của Strict Mode
        isFocusModeActive: !!activeSchedule // Giữ focus mode nếu có lịch trình
    });

    chrome.alarms.clear(POMODORO_ALARM_NAME);
    chrome.alarms.clear(POMODORO_TICK_ALARM_NAME); // Dừng tick

    // Gửi thông báo cho người dùng
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Focus Assistant',
        message: notificationMessages[currentLang],
        priority: 2
    });

    console.log('Pomodoro ended.');
    updateBlockingRules(); // Cập nhật lại quy tắc chặn
}

/**
 * Dừng Pomodoro hiện tại (nếu có).
 */
async function stopPomodoro() {
    const { pomodoro, isStrictModActive } = await chrome.storage.sync.get(['pomodoro', 'isStrictModActive']);
    const activeSchedule = getActiveSchedule((await chrome.storage.sync.get('schedules')).schedules || []);

    if (isStrictModActive && pomodoro.isActive) {
        console.log("Strict mode is ON. Cannot stop Pomodoro manually.");
        // Có thể gửi thông báo cho người dùng biết là không thể dừng
        return; // Không cho dừng
    }

    await chrome.storage.sync.set({
        pomodoro: { ...pomodoro, isActive: false },
        isFocusModeActive: !!activeSchedule // Giữ focus mode nếu có lịch trình
    });
    chrome.alarms.clear(POMODORO_ALARM_NAME);
    chrome.alarms.clear(POMODORO_TICK_ALARM_NAME);
    console.log('Pomodoro stopped manually.');
    updateBlockingRules();
}


// --- QUẢN LÝ LỊCH TRÌNH CHẶN TỰ ĐỘNG ---

/**
 * Thiết lập alarm định kỳ để kiểm tra lịch trình.
 */
function setupScheduledChecks() {
    // Xóa alarm cũ nếu có để tránh trùng lặp
    chrome.alarms.clear(SCHEDULE_CHECK_ALARM_NAME, (wasCleared) => {
        // Tạo alarm mới, chạy mỗi phút để kiểm tra
        chrome.alarms.create(SCHEDULE_CHECK_ALARM_NAME, {
            delayInMinutes: 0, // Bắt đầu ngay
            periodInMinutes: 1   // Lặp lại mỗi phút
        });
        console.log('Scheduled check alarm configured.');
        checkSchedulesAndApplyBlocking(); // Kiểm tra ngay khi thiết lập
    });
}


/**
 * Kiểm tra các lịch trình và áp dụng chặn nếu cần.
 */
async function checkSchedulesAndApplyBlocking() {
    const { schedules, isFocusModeActive, pomodoro, isStrictModActive } = await chrome.storage.sync.get([
        'schedules',
        'isFocusModeActive',
        'pomodoro',
        'isStrictModActive'
    ]);

    const activeSchedule = getActiveSchedule(schedules || []);

    if (activeSchedule) {
        // Nếu có lịch trình đang hoạt động và focus mode chưa bật, hãy bật nó.
        if (!isFocusModeActive) {
            console.log(`Active schedule found (${activeSchedule.id}). Activating focus mode.`);
            await chrome.storage.sync.set({ isFocusModeActive: true });
            // updateBlockingRules() sẽ được gọi bởi listener của storage.onChanged
        }
    } else {
        // Không có lịch trình nào hoạt động.
        // Nếu focus mode đang bật CHỈ VÌ lịch trình (không phải do Pomodoro hay thủ công) thì tắt nó.
        const manualFocus = (await chrome.storage.sync.get('manualFocusStateBeforeSchedule')).manualFocusStateBeforeSchedule;

        if (isFocusModeActive && !pomodoro.isActive && !manualFocus) {
            // Kiểm tra xem isFocusModeActive có phải do người dùng tự bật không
            // Đây là một điểm khó: làm sao biết isFocusModeActive là do lịch trình hay do người dùng tự bật?
            // Một cách là lưu trạng thái isFocusModeActive trước khi lịch trình kích hoạt.
            // Hiện tại, đơn giản là nếu không có Pomodoro và không có lịch trình,
            // và isFocusModeActive đang true, thì có thể là do người dùng bật thủ công hoặc lịch trình vừa kết thúc.
            // Nếu lịch trình vừa kết thúc, ta nên tắt isFocusModeActive.
            // Giả sử: nếu không có pomodoro và không có schedule, isFocusModeActive sẽ được kiểm soát bởi người dùng.
            // Nếu một lịch trình kết thúc, và isFocusModeActive đang true, và không có pomodoro,
            // thì ta nên đặt isFocusModeActive về false, trừ khi người dùng đã bật nó thủ công TRƯỚC KHI lịch trình bắt đầu.
            // Điều này cần một chút logic phức tạp hơn để theo dõi "nguồn gốc" của isFocusModeActive.

            // Đơn giản hóa: Nếu không có Pomodoro và không có lịch trình, isFocusModeActive sẽ do người dùng quyết định.
            // Nếu một lịch trình vừa kết thúc, nó sẽ không tự động tắt isFocusModeActive nếu người dùng đã bật nó.
            // Logic này sẽ được xử lý trong updateBlockingRules khi nó kiểm tra isFocusModeActive, pomodoro.isActive và activeSchedule.

            // Nếu isFocusModeActive là true, nhưng không có pomodoro và không có schedule,
            // thì đó là do người dùng bật thủ công. Không làm gì cả.
            // Nếu isFocusModeActive là true, VÀ NÓ ĐƯỢC BẬT BỞI LỊCH TRÌNH TRƯỚC ĐÓ, thì tắt nó.
            // Để đơn giản, hàm này chỉ đảm bảo BẬT focus mode nếu có lịch trình.
            // Việc TẮT focus mode khi lịch trình kết thúc (và không có yếu tố khác) sẽ được xử lý gián tiếp
            // bởi updateBlockingRules khi nó không thấy activeSchedule nữa.
            // Tuy nhiên, nếu isFocusModeActive vẫn là true (do người dùng bật thủ công), nó vẫn sẽ chặn.
            // Điều này là hợp lý.
            console.log('No active schedule. Focus mode state determined by manual toggle or Pomodoro.');
        }
    }
    // updateBlockingRules() sẽ được gọi bởi storage.onChanged nếu isFocusModeActive thay đổi,
    // hoặc được gọi trực tiếp nếu cần thiết (ví dụ: khi danh sách chặn thay đổi).
    // Trong trường hợp này, nếu isFocusModeActive thay đổi, listener sẽ kích hoạt updateBlockingRules.
    // Nếu không, nhưng danh sách chặn hoặc các yếu tố khác thay đổi, updateBlockingRules cũng cần chạy.
    // Để đảm bảo, gọi nó ở đây.
    updateBlockingRules();
}


/**
 * Lấy lịch trình đang hoạt động (nếu có).
 * @param {Array} schedules - Danh sách các lịch trình.
 * @returns {Object|null} Lịch trình đang hoạt động hoặc null.
 */
function getActiveSchedule(schedules) {
    if (!schedules || schedules.length === 0) return null;

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Chủ Nhật, 1 = Thứ Hai, ..., 6 = Thứ Bảy
    const currentTime = now.getHours() * 100 + now.getMinutes(); // Ví dụ: 9:30 AM -> 930, 5:00 PM -> 1700

    // Ánh xạ getDay() sang định dạng của chúng ta (T2-CN)
    const dayMapping = [
        'CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'
    ];
    const currentDayStr = dayMapping[currentDay];

    for (const schedule of schedules) {
        if (!schedule.isActive || !schedule.days || !schedule.startTime || !schedule.endTime) continue;

        if (schedule.days.includes(currentDayStr)) {
            const [startH, startM] = schedule.startTime.split(':').map(Number);
            const [endH, endM] = schedule.endTime.split(':').map(Number);
            const scheduleStart = startH * 100 + startM;
            const scheduleEnd = endH * 100 + endM;

            if (currentTime >= scheduleStart && currentTime < scheduleEnd) {
                return schedule; // Tìm thấy lịch trình đang hoạt động
            }
        }
    }
    return null; // Không có lịch trình nào hoạt động
}

// --- XỬ LÝ STRICT MODE ---
// Logic của Strict Mode chủ yếu được áp dụng trong các hàm thay đổi trạng thái:
// - Khi người dùng cố gắng TẮT chế độ tập trung thủ công (popup.js sẽ kiểm tra).
// - Khi người dùng cố gắng THAY ĐỔI danh sách chặn (options.js sẽ kiểm tra).
// - Khi người dùng cố gắng DỪNG Pomodoro (hàm stopPomodoro ở trên đã có).
// background.js là nơi "cuối cùng" có thể thực thi Strict Mode nếu UI không kiểm tra,
// bằng cách không cho phép thay đổi storage nếu Strict Mode đang BẬT và có phiên hoạt động.

// Ví dụ: Sửa đổi hàm set trong storage listener để kiểm tra Strict Mode
// Tuy nhiên, cách tiếp cận tốt hơn là UI phải tự vô hiệu hóa các hành động đó.
// background.js sẽ tin tưởng rằng UI đã xử lý việc này.
// Nếu muốn background.js "cứng rắn" hơn:
// Trong `chrome.storage.onChanged`, nếu `changes.isFocusModeActive` thành `false`
// và `isStrictModActive` là `true` và (Pomodoro đang chạy HOẶC có lịch trình đang chạy),
// thì `background.js` có thể tự động đặt lại `isFocusModeActive` thành `true`.
// Điều này làm tăng độ phức tạp. Hiện tại, chúng ta sẽ dựa vào UI để xử lý Strict Mode.

// Gọi hàm cập nhật quy tắc khi extension khởi động (sau khi onInstalled chạy xong)
// để đảm bảo trạng thái ban đầu được áp dụng.
updateBlockingRules();
setupScheduledChecks();

console.log('Focus Assistant background script loaded.');
