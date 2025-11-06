export default function Header() {
  return (
    <header className="bg-gray-800 text-white p-4 shadow-xl sticky top-0 z-10">
      <nav className="container mx-auto flex justify-between items-center">
        <a href="/" className="text-2xl font-extrabold tracking-wide">LangBridge</a>
        <div className="space-x-4 text-sm font-medium">
          <a href="/protected" className="hover:text-blue-300 transition duration-150">Protected</a>
          <a href="/auth/login" className="bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded transition duration-150">로그인</a>
        </div>
      </nav>
    </header>
  );
}