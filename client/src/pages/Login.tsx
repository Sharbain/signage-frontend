export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center" 
         style={{ backgroundImage: "url('/bg.jpg')" }}>
      
      <div className="glass p-10 w-[380px]">
        <h1 className="text-3xl font-bold gradient-text text-center mb-6">
          CMS Login
        </h1>

        <div className="flex flex-col gap-4">
          <input 
            type="email" 
            placeholder="Email"
            className="w-full p-3 rounded-lg border border-white/30 bg-white/20 text-white focus:outline-none"
          />

          <input 
            type="password" 
            placeholder="Password"
            className="w-full p-3 rounded-lg border border-white/30 bg-white/20 text-white focus:outline-none"
          />

          <button className="button-gradient w-full text-lg">
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
