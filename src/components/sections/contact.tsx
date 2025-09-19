"use client";
import React, { FC, useEffect, useRef, useState } from "react";
import ProfileCard from "../ProfileCard";
import lottie, { AnimationItem } from "lottie-web";
const Contact: FC = () => {
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<
    Array<{ text: string; isUser: boolean; timestamp: string; id: number }>
  >([]);
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lottieRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    // 确保不会重复加载动画
    if (lottieRef.current && !animationRef.current) {
      animationRef.current = lottie.loadAnimation({
        container: lottieRef.current!,
        path: "/assets/playful_cat.json",
        loop: true,
        autoplay: true,
      });
    }

    // 清理函数
    return () => {
      if (animationRef.current) {
        animationRef.current.destroy();
        animationRef.current = null;
      }
    };
  }, []);

  // 保存对话状态
  const conversationStateRef = useRef<{
    questionIndex: number;
    isAsking: boolean;
    isCompleted: boolean;
    hasStarted: boolean; // 添加这个状态来跟踪对话是否已经开始
  }>({
    questionIndex: 0,
    isAsking: true,
    isCompleted: false,
    hasStarted: false, // 初始化为false
  });

  // 预定义的用户问题
  const userQuestions = [
    "hello,who are you?",
    "And what is derwyn's portfolio?",
  ];
  // const userQuestions = [
  //   "你好，能介绍一下你自己吗？",
  //   "你的技术栈有哪些？",
  //   "你有多少年的开发经验？",
  //   "你最擅长的前端框架是什么？",
  //   "你做过哪些有趣的项目？",
  //   "你对AI技术有什么看法？",
  //   "你平时如何学习新技术？",
  //   "你对未来前端发展有什么预测？",
  // ];

  // 预定义的AI回复
  const aiResponses = [
    "I'm derwyn, a front-end engineer. I am passionate about creating beautiful and user-friendly interface experiences.",
    "This is my personal website, showcasing my skill set, development experience, projects I have participated in, as well as some interesting demos and places I have visited.",
  ];
  // const aiResponses = [
  //   "您好！我是Derwyn，一名热爱前端开发的工程师。我专注于创造优雅且用户友好的界面体验。",
  //   "我主要使用React、Vue、Next.js等现代前端框架，同时也熟悉Node.js后端开发和各种数据库技术。",
  //   "我有超过8年的Web开发经验，经历了从传统网站到现代Web应用的演变过程。",
  //   "我最擅长的是React生态系统，包括Redux状态管理、React Hooks等最新特性。",
  //   "我参与过多个医疗互联网项目，包括医院信息系统、远程医疗平台等，也开发过一些创意性的个人项目。",
  //   "我认为AI技术正在深刻改变前端开发方式，从智能代码补全到自动化测试，都大大提升了开发效率。",
  //   "我喜欢通过实际项目来学习新技术，同时也会关注技术社区的最新动态和最佳实践。",
  //   "我认为前端将更加注重用户体验和性能优化，WebAssembly和AI集成将成为重要趋势。",
  // ];

  useEffect(() => {
    // 滚动到底部
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  // 添加消息到聊天窗口
  const addMessage = (text: string, isUser: boolean) => {
    const newMessage = {
      text,
      isUser,
      timestamp: "just now",
      id: Date.now(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  // 启动自动问答动画
  const startAutoChat = () => {
    // 如果正在播放动画，直接返回
    if (isAnimationPlaying) return;

    // 标记对话已开始
    conversationStateRef.current.hasStarted = true;
    setIsAnimationPlaying(true);

    let { questionIndex, isAsking } = conversationStateRef.current;

    const animateChat = () => {
      if (questionIndex >= userQuestions.length) {
        conversationStateRef.current.isCompleted = true;
        setIsAnimationPlaying(false);
        return;
      }

      if (isAsking) {
        // 添加用户问题
        addMessage(userQuestions[questionIndex], true);
        isAsking = false;
      } else {
        // 添加AI回复
        addMessage(aiResponses[questionIndex], false);
        questionIndex++;
        isAsking = true;
      }

      // 更新对话状态
      conversationStateRef.current.questionIndex = questionIndex;
      conversationStateRef.current.isAsking = isAsking;

      // 设置下一个动画定时器
      animationTimeoutRef.current = setTimeout(
        animateChat,
        isAsking ? 2000 : 1500
      );
    };

    // 启动动画
    animationTimeoutRef.current = setTimeout(animateChat, 500);
  };

  // 停止动画
  const stopAutoChat = () => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    setIsAnimationPlaying(false);
  };

  // 设置滚动监听
  useEffect(() => {
    if (!sectionRef.current) return;

    // 创建交叉观察器
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 当组件进入视口时启动动画
            startAutoChat();
          } else {
            // 当组件离开视口时停止动画但不重置状态
            stopAutoChat();
          }
        });
      },
      {
        threshold: 0.5, // 当50%的元素可见时触发
      }
    );

    // 开始观察
    observerRef.current.observe(sectionRef.current);

    // 清理函数
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // 添加鼠标滚轮事件处理，使iPhone容器内的聊天可以独立滚动
  useEffect(() => {
    const chatContainer = chatMessagesRef.current;
    if (!chatContainer) return;

    // 阻止事件冒泡，让滚动事件在容器内处理
    const handleWheel = (e: WheelEvent) => {
      e.stopPropagation();

      // 计算滚动方向和距离
      const delta = e.deltaY;

      // 手动滚动容器
      chatContainer.scrollTop += delta;

      // 阻止默认行为以防止外层滚动
      e.preventDefault();
    };

    // 添加事件监听器
    chatContainer.addEventListener("wheel", handleWheel, { passive: false });

    // 清理函数
    return () => {
      chatContainer.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <div ref={sectionRef} className="relative w-full min-h-dvh py-20 px-4">
      <div className="_101-background"></div>
      <div className="absolute top-[100px] h-[450px] left-[-5px] right-[-5px]">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1424 620"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0.00536893 20.0468C-0.00354 9.00117 8.30225 -5.41386e-05 19.3479 -5.37162e-05C160.924 -4.83021e-05 1041.73 -1.46185e-05 1404.46 -7.4708e-07C1415.51 -3.24674e-07 1424 9.00122 1423.99 20.0469C1423.73 353.185 1410.05 620 712 620C13.9475 620 0.273125 353.185 0.00536893 20.0468Z"
            fill="#1f242d"
          ></path>
        </svg>
      </div>
      <div className="absolute flex w-[260px] h-[260px] left-[50%] top-[-30px] ml-[-100px] text-white justify-center items-center special-font text-[30px]">
        <div ref={lottieRef} className="mr-[5px]"></div>
        <img
          src="/assets/contact.svg"
          alt="mobile"
          className="w-[155px] mt-[10px]"
        />
      </div>
      <div className="relative flex justify-center items-center gap-[160px] mt-[100px] z-100 ">
        {/* iPhone手机外壳 */}
        <div className="relative w-[320px] h-[650px] bg-black rounded-[40px] border-[12px] border-black shadow-2xl">
          {/* 手机刘海 */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10"></div>

          {/* 手机屏幕 */}
          <div className="w-full h-full rounded-[32px] bg-gray-900 overflow-hidden relative">
            {/* 状态栏 */}
            <div className="absolute top-2 left-0 right-0 flex justify-center items-center">
              <div className="text-white text-xs font-medium">9:41</div>
            </div>

            {/* 毛玻璃对话框容器 */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div
                className={`w-full h-full ${
                  conversationStateRef.current.hasStarted &&
                  "shadow-lg rounded-2xl flex-col"
                }`}
              >
                {/* Chat Messages */}
                <div
                  ref={chatMessagesRef}
                  className="flex-1 p-4 pt-7 flex flex-col gap-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
                  style={{ maxHeight: "100%", height: "100%" }}
                >
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${
                        msg.isUser ? "self-end flex-row-reverse" : "self-start"
                      }`}
                    >
                      {/* 头像 */}
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                        <img
                          src={
                            msg.isUser
                              ? "/assets/user.png"
                              : "/assets/portrait.webp"
                          }
                          alt={msg.isUser ? "User" : "Portrait"}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* 消息气泡 */}
                      <div
                        className={`p-3 rounded-2xl relative animate-bubbleZoom ${
                          msg.isUser
                            ? "self-end bg-[#2f2b1e] text-[#f4a443] border border-[#f4a443] rounded-br-none max-w-[90%]"
                            : "self-start bg-gray-200 text-gray-800 rounded-bl-none max-w-[90%]"
                        }`}
                      >
                        <div className="whitespace-pre-wrap leading-relaxed text-sm overflow-hidden">
                          {msg.text}
                        </div>
                        <div className="text-xs mt-1 opacity-70 text-right">
                          {msg.timestamp}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 手机底部指示器 */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gray-600 rounded-full"></div>
          </div>
        </div>
        <ProfileCard
          name="Derwyn"
          title="Frontend Developer"
          handle="derwynking"
          status="Online"
          contactText="Contact Me"
          avatarUrl="/assets/portrait.webp"
          iconUrl="/assets/iconpattern.png"
          showUserInfo={true}
          enableTilt={true}
          enableMobileTilt={false}
          onContactClick={() => console.log("Contact clicked")}
        />
      </div>
    </div>
  );
};

export default Contact;
