import { AuthService, LocalStorageAuthStorage, MockAuthGateway } from 'shared/libs/auth';

const storage = new LocalStorageAuthStorage('tessaro.app.session');
const gateway = new MockAuthGateway();

const authService = new AuthService(gateway, storage);

export default authService;
