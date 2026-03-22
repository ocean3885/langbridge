/** @type {import('next').NextConfig} */
const nextConfig = {
  // sqlite3를 서버 외부 패키지로 지정
  serverExternalPackages: ['sqlite3'],
  
  // 만약 기존에 다른 설정이 있다면 그 아래에 추가하세요.
  experimental: {
    serverActions: true, // 에러 메시지에 있던 설정 유지
  },
};

export default nextConfig;