const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
let authToken = null;

// テスト用のユーザー情報
const testUser = {
    username: 'kaho052514github@gmail.com',
    password: 'test123'
};

// ログイン機能のテスト
async function testLogin() {
    console.log('=== ログインテスト ===');
    try {
        const response = await axios.post(`${API_BASE}/login`, testUser);
        authToken = response.data.token;
        console.log('✅ ログイン成功:', response.data.user);
        return true;
    } catch (error) {
        console.log('❌ ログイン失敗:', error.response?.data || error.message);
        return false;
    }
}

// ユーザー一覧取得のテスト
async function testGetUsers() {
    console.log('\n=== ユーザー一覧取得テスト ===');
    try {
        const response = await axios.get(`${API_BASE}/users`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ ユーザー一覧取得成功:', response.data.length + '件');
        return true;
    } catch (error) {
        console.log('❌ ユーザー一覧取得失敗:', error.response?.data || error.message);
        return false;
    }
}

// ゲーム一覧取得のテスト
async function testGetGames() {
    console.log('\n=== ゲーム一覧取得テスト ===');
    try {
        const response = await axios.get(`${API_BASE}/games`);
        console.log('✅ ゲーム一覧取得成功:', response.data.length + '件');
        return true;
    } catch (error) {
        console.log('❌ ゲーム一覧取得失敗:', error.response?.data || error.message);
        return false;
    }
}

// レート制限のテスト
async function testRateLimit() {
    console.log('\n=== レート制限テスト ===');
    const promises = [];
    for (let i = 0; i < 6; i++) {
        promises.push(
            axios.post(`${API_BASE}/login`, {
                username: 'invalid@test.com',
                password: 'wrongpassword'
            }).catch(error => error.response)
        );
    }
    
    const results = await Promise.all(promises);
    const blocked = results.filter(r => r?.status === 429);
    console.log(`✅ レート制限テスト: ${blocked.length > 0 ? '成功' : '失敗'}`);
    return blocked.length > 0;
}

// セッション管理のテスト
async function testSession() {
    console.log('\n=== セッション管理テスト ===');
    try {
        // 有効なトークンでのアクセス
        const validResponse = await axios.get(`${API_BASE}/users`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ 有効なセッションでのアクセス成功');
        
        // 無効なトークンでのアクセス
        try {
            await axios.get(`${API_BASE}/users`, {
                headers: { Authorization: 'Bearer invalid_token' }
            });
            console.log('❌ 無効なセッションでのアクセスが成功してしまった');
            return false;
        } catch (error) {
            if (error.response?.status === 403) {
                console.log('✅ 無効なセッションでのアクセスが適切に拒否された');
                return true;
            }
        }
    } catch (error) {
        console.log('❌ セッション管理テスト失敗:', error.response?.data || error.message);
        return false;
    }
}

// メイン実行関数
async function runTests() {
    console.log('🚀 APIテスト開始\n');
    
    const results = {
        login: await testLogin(),
        users: await testGetUsers(),
        games: await testGetGames(),
        rateLimit: await testRateLimit(),
        session: await testSession()
    };
    
    console.log('\n=== テスト結果サマリー ===');
    Object.entries(results).forEach(([test, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? '成功' : '失敗'}`);
    });
    
    const passedCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    console.log(`\n総合結果: ${passedCount}/${totalCount} テスト成功`);
}

// テスト実行
runTests().catch(console.error); 