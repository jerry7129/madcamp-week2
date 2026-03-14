export default function SocialLogin() {
  const socialLogins = [
    { name: 'Google', bgColor: 'bg-white', borderColor: 'border-gray-200', icon: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg',
      url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=' +
      process.env.NEXT_PUBLIC_CLIENT_ID +
      '&redirect_uri=' +
      process.env.NEXT_PUBLIC_REDIRECTION_URI +
      '&response_type=code' +
      '&scope=email profile'
    },
    // { name: 'Apple', bgColor: 'bg-white', borderColor: 'border-gray-200', icon: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg', url: '_self' },
    // { name: 'NAVER', bgColor: 'bg-[#03C75A]', borderColor: 'border-transparent', icon: 'images/naver.png', url: '_self' },
    // { name: 'Kakao', bgColor: 'bg-[#FEE500]', borderColor: 'border-transparent', icon: 'images/kakao.png', url: '_self' },
  ];

  return (
    <>
      <hr className="my-4 border-gray-300" />

      {/* Social login container */}
      <p className="mb-2">소셜 계정으로 로그인</p>
      <div className="flex flex-row justify-center gap-4">
        {socialLogins.map((social) => (
          <button
            key={social.name}
            className={`w-10 h-10 p-2 bg-no-repeat bg-center bg-origin-content bg-contain rounded-full ${social.bgColor} ${social.borderColor} border cursor-pointer`}
            onClick={() => {
              console.log("Trying to log in with", social.name);
              // alert(social.url);
              window.location.href = social.url;
            }}
            style={{ backgroundImage: `url(${social.icon})` }}
          />
        ))}
      </div>
    </>
  );
}