// 家事記録アプリのメインロジック

// データストレージの定数
const STORAGE_KEY = 'chores_data';

// 家事データを管理するクラス
class ChoreManager {
    constructor() {
        this.chores = this.loadChores();
    }

    // localStorageから家事データを読み込む
    loadChores() {
        const data = localStorage.getItem(STORAGE_KEY);
        const chores = data ? JSON.parse(data) : [];
        // 既存データのマイグレーション（lastDone → history）
        return chores.map(chore => this.migrateChoreData(chore));
    }

    // 旧データ形式から新データ形式への変換
    migrateChoreData(chore) {
        // 既に新形式の場合はそのまま返す
        if (chore.history !== undefined) {
            return chore;
        }
        // 旧形式の場合は変換
        return {
            id: chore.id,
            name: chore.name,
            history: chore.lastDone ? [chore.lastDone] : [],
            createdAt: chore.createdAt
        };
    }

    // localStorageに家事データを保存
    saveChores() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.chores));
    }

    // 新しい家事を追加
    addChore(name) {
        const chore = {
            id: Date.now().toString(),
            name: name,
            history: [],
            createdAt: new Date().toISOString()
        };
        this.chores.push(chore);
        this.saveChores();
        return chore;
    }

    // 家事を削除
    deleteChore(id) {
        this.chores = this.chores.filter(chore => chore.id !== id);
        this.saveChores();
    }

    // 家事の実施記録を更新（今日の日付）
    markAsDone(id) {
        const date = new Date().toISOString();
        this.addHistory(id, date);
    }

    // 家事の実施記録を追加（日付指定）
    addHistory(id, dateString) {
        const chore = this.chores.find(chore => chore.id === id);
        if (chore) {
            // 履歴に追加（重複チェック）
            const dateOnly = dateString.split('T')[0];
            const exists = chore.history.some(h => h.split('T')[0] === dateOnly);

            if (!exists) {
                chore.history.push(dateString);
                // 新しい順にソート
                chore.history.sort((a, b) => new Date(b) - new Date(a));
                this.saveChores();
            }
        }
    }

    // 履歴から特定の記録を削除
    deleteHistory(choreId, dateString) {
        const chore = this.chores.find(chore => chore.id === choreId);
        if (chore) {
            chore.history = chore.history.filter(h => h !== dateString);
            this.saveChores();
        }
    }

    // 全ての家事を取得（経過日数でソート）
    getAllChores() {
        return this.chores.sort((a, b) => {
            const daysA = this.getDaysSinceLastDone(a);
            const daysB = this.getDaysSinceLastDone(b);

            // まだやっていないものは最後に
            if (daysA === null && daysB === null) return 0;
            if (daysA === null) return 1;
            if (daysB === null) return -1;

            // 経過日数が多い順
            return daysB - daysA;
        });
    }

    // 最後にやってからの経過日数を計算
    getDaysSinceLastDone(chore) {
        if (!chore.history || chore.history.length === 0) {
            return null;
        }
        // 履歴は既にソート済み（新しい順）なので最初の要素を使用
        const lastDone = new Date(chore.history[0]);
        const now = new Date();
        const diffTime = now - lastDone;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    // 最後の実施日を取得
    getLastDoneDate(chore) {
        if (!chore.history || chore.history.length === 0) {
            return null;
        }
        return chore.history[0];
    }

    // 経過日数に基づくステータスを取得
    getStatus(chore) {
        const days = this.getDaysSinceLastDone(chore);

        if (days === null) {
            return 'never';
        } else if (days <= 3) {
            return 'recent';
        } else if (days <= 7) {
            return 'soon';
        } else {
            return 'overdue';
        }
    }
}

// UIを管理するクラス
class ChoreUI {
    constructor(choreManager) {
        this.choreManager = choreManager;
        this.choresList = document.getElementById('chores-list');
        this.emptyState = document.getElementById('empty-state');
        this.addChoreForm = document.getElementById('add-chore-form');
        this.choreNameInput = document.getElementById('chore-name-input');
        this.currentChoreId = null; // モーダルで使用する家事ID

        this.initEventListeners();
        this.render();
    }

    // イベントリスナーを初期化
    initEventListeners() {
        this.addChoreForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddChore();
        });
    }

    // 家事を追加するハンドラー
    handleAddChore() {
        const name = this.choreNameInput.value.trim();
        if (name) {
            this.choreManager.addChore(name);
            this.choreNameInput.value = '';
            this.render();
        }
    }

    // 家事を削除するハンドラー
    handleDeleteChore(id) {
        if (confirm('この家事を削除しますか？')) {
            this.choreManager.deleteChore(id);
            this.render();
        }
    }

    // 家事を完了するハンドラー
    handleMarkAsDone(id) {
        this.choreManager.markAsDone(id);
        this.render();
    }

    // 日付選択モーダルを開く
    handleAddWithDate(id) {
        this.currentChoreId = id;
        this.showDateModal();
    }

    // 日付選択モーダルを表示
    showDateModal() {
        const modal = document.getElementById('date-modal');
        const dateInput = document.getElementById('date-input');
        // デフォルトを今日に設定
        dateInput.value = new Date().toISOString().split('T')[0];
        modal.style.display = 'flex';
    }

    // 日付選択モーダルを閉じる
    closeDateModal() {
        const modal = document.getElementById('date-modal');
        modal.style.display = 'none';
        this.currentChoreId = null;
    }

    // 選択した日付で記録を追加
    handleSubmitDate() {
        const dateInput = document.getElementById('date-input');
        const dateValue = dateInput.value;

        if (dateValue && this.currentChoreId) {
            // 日付文字列をISO形式に変換
            const dateISO = new Date(dateValue + 'T12:00:00').toISOString();
            this.choreManager.addHistory(this.currentChoreId, dateISO);
            this.closeDateModal();
            this.render();
        }
    }

    // 履歴の表示/非表示を切り替え
    toggleHistory(id) {
        const historyElement = document.getElementById(`history-${id}`);
        const toggleButton = document.getElementById(`toggle-history-${id}`);

        if (historyElement.style.display === 'none' || historyElement.style.display === '') {
            historyElement.style.display = 'block';
            toggleButton.textContent = '履歴を非表示';
        } else {
            historyElement.style.display = 'none';
            toggleButton.textContent = '履歴を表示';
        }
    }

    // 履歴を削除
    handleDeleteHistory(choreId, dateString) {
        if (confirm('この記録を削除しますか？')) {
            this.choreManager.deleteHistory(choreId, dateString);
            this.render();
        }
    }

    // UIを再描画
    render() {
        const chores = this.choreManager.getAllChores();

        if (chores.length === 0) {
            this.choresList.style.display = 'none';
            this.emptyState.style.display = 'block';
        } else {
            this.choresList.style.display = 'flex';
            this.emptyState.style.display = 'none';
            this.choresList.innerHTML = chores.map(chore => this.createChoreCard(chore)).join('');

            // イベントリスナーを追加
            chores.forEach(chore => {
                const doneButton = document.getElementById(`done-${chore.id}`);
                const addDateButton = document.getElementById(`add-date-${chore.id}`);
                const deleteButton = document.getElementById(`delete-${chore.id}`);
                const toggleHistoryButton = document.getElementById(`toggle-history-${chore.id}`);

                doneButton.addEventListener('click', () => this.handleMarkAsDone(chore.id));
                addDateButton.addEventListener('click', () => this.handleAddWithDate(chore.id));
                deleteButton.addEventListener('click', () => this.handleDeleteChore(chore.id));

                if (toggleHistoryButton) {
                    toggleHistoryButton.addEventListener('click', () => this.toggleHistory(chore.id));
                }

                // 履歴削除ボタンのイベントリスナー
                chore.history.forEach((date, index) => {
                    const deleteHistoryButton = document.getElementById(`delete-history-${chore.id}-${index}`);
                    if (deleteHistoryButton) {
                        deleteHistoryButton.addEventListener('click', () => this.handleDeleteHistory(chore.id, date));
                    }
                });
            });
        }
    }

    // 家事カードのHTMLを生成
    createChoreCard(chore) {
        const days = this.choreManager.getDaysSinceLastDone(chore);
        const status = this.choreManager.getStatus(chore);

        let dateText, daysText;

        if (days === null) {
            dateText = 'まだ記録がありません';
            daysText = '未実施';
        } else {
            const lastDoneDate = new Date(this.choreManager.getLastDoneDate(chore));
            dateText = `最後の実施: ${this.formatDate(lastDoneDate)}`;

            if (days === 0) {
                daysText = '今日';
            } else if (days === 1) {
                daysText = '1日前';
            } else {
                daysText = `${days}日前`;
            }
        }

        // 履歴のHTML生成
        const historyHTML = this.createHistoryHTML(chore);

        return `
            <div class="chore-card status-${status}">
                <div class="chore-info">
                    <div class="chore-name">${this.escapeHtml(chore.name)}</div>
                    <div class="chore-date">
                        ${dateText}
                        <span class="days-badge">${daysText}</span>
                    </div>
                    ${historyHTML}
                </div>
                <div class="chore-actions">
                    <button id="done-${chore.id}" class="done-button">今日やった</button>
                    <button id="add-date-${chore.id}" class="add-date-button">日付指定</button>
                    <button id="delete-${chore.id}" class="delete-button">削除</button>
                </div>
            </div>
        `;
    }

    // 履歴のHTMLを生成
    createHistoryHTML(chore) {
        if (!chore.history || chore.history.length === 0) {
            return '';
        }

        const toggleButton = chore.history.length > 0
            ? `<button id="toggle-history-${chore.id}" class="toggle-history-button">履歴を表示 (${chore.history.length}件)</button>`
            : '';

        const historyItems = chore.history.map((date, index) => {
            const dateObj = new Date(date);
            return `
                <div class="history-item">
                    <span>${this.formatDate(dateObj)}</span>
                    <button id="delete-history-${chore.id}-${index}" class="delete-history-button">×</button>
                </div>
            `;
        }).join('');

        return `
            ${toggleButton}
            <div id="history-${chore.id}" class="history-list" style="display: none;">
                ${historyItems}
            </div>
        `;
    }

    // 日付をフォーマット
    formatDate(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}年${month}月${day}日`;
    }

    // HTMLエスケープ
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', () => {
    const choreManager = new ChoreManager();
    const choreUI = new ChoreUI(choreManager);

    // モーダルのイベントリスナー
    const modal = document.getElementById('date-modal');
    const closeModalButton = document.getElementById('close-modal');
    const cancelModalButton = document.getElementById('cancel-modal');
    const submitDateButton = document.getElementById('submit-date');

    closeModalButton.addEventListener('click', () => choreUI.closeDateModal());
    cancelModalButton.addEventListener('click', () => choreUI.closeDateModal());
    submitDateButton.addEventListener('click', () => choreUI.handleSubmitDate());

    // モーダルの外側をクリックしたら閉じる
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            choreUI.closeDateModal();
        }
    });
});
