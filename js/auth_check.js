document.addEventListener('DOMContentLoaded', function() {
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  
  // ログインページや登録ページ自体はチェック対象外
  const isAuthPage = window.location.pathname.includes('login') || 
                     window.location.pathname.includes('register') ||
                     window.location.pathname.includes('pin_');
  
  if (!isAuthPage && (!isAuthenticated || isAuthenticated !== "true")) {
    // 現在のページを保存（ログイン後に戻るため）
    sessionStorage.setItem('returnUrl', window.location.href);
    
    // PINログインページにリダイレクト
    window.location.href = "../pin_login.html";
    return;
  }
  
  // 職種に応じた権限チェック
  if (isAuthenticated === "true") {
    const userData = localStorage.getItem('registeredUser');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        
        // 管理者専用ページのチェック
        const isAdminPage = window.location.pathname.includes('admin') || 
                           window.location.pathname.includes('management') ||
                           window.location.pathname.includes('system');
        
        if (isAdminPage && user.jobTitle !== 'manager') {
          alert('このページにアクセスするには管理者権限が必要です。');
          window.location.href = "../index.html";
          return;
        }
        
        // セキュリティログ記録（職種情報付き）
        console.log(`[${new Date().toISOString()}] ${user.jobTitle === 'manager' ? '管理者' : 'スタッフ'}がページにアクセス: ${window.location.pathname}`);
        
      } catch (error) {
        console.error('ユーザー情報の解析に失敗:', error);
      }
    }
  }
  
  // セッション管理（30分で自動ログアウト）
  const lastLoginTime = localStorage.getItem('lastLoginTime');
  if (lastLoginTime) {
    const now = Date.now();
    const timeDiff = now - parseInt(lastLoginTime);
    const thirtyMinutes = 30 * 60 * 1000;
    
    if (timeDiff > thirtyMinutes) {
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('lastLoginTime');
      alert('セッションが期限切れです。再度ログインしてください。');
      window.location.href = "../pin_login.html";
      return;
    }
  }
  
  // アカウントロック状態チェック
  const lockEndTime = localStorage.getItem('lockEndTime');
  if (lockEndTime) {
    const now = Date.now();
    const lockEnd = parseInt(lockEndTime);
    
    if (now < lockEnd) {
      // まだロック中
      alert('アカウントがロックされています。しばらくお待ちください。');
      window.location.href = "../pin_login.html";
      return;
    } else {
      // ロック解除
      localStorage.removeItem('lockEndTime');
      localStorage.removeItem('loginAttempts');
    }
  }
});

// 職種に応じた権限チェック関数（他のスクリプトから使用可能）
function checkPermission(requiredRole = 'staff') {
  const userData = localStorage.getItem('registeredUser');
  if (!userData) return false;
  
  try {
    const user = JSON.parse(userData);
    
    if (requiredRole === 'manager') {
      return user.jobTitle === 'manager';
    }
    
    return true; // スタッフ以上は全ページアクセス可能
  } catch (error) {
    console.error('権限チェックエラー:', error);
    return false;
  }
}

// 管理者権限チェック関数
function isManager() {
  return checkPermission('manager');
} 