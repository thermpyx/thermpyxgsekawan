(() => {
  "use strict";


  /* =======================================================
     DEVELOPERS
  ======================================================= */

  const developers = [
    {
      nickname: "Nathan",
      fullName: "Reinhart Van Diaz",
      role: "Project Contributor / Blacksmith",
      image: "assets/developers/dev-1.jpg",

      motto: {
        en: "Stay curious, stay growing.",
        id: "pergi karena tugas, pulang karena di telfon"
      },

      bio: {
        en:
          "A collaborative contributor in THERMPYX who helps turn the team's ideas into an interactive learning experience. THERMPYX became one of his first opportunities to explore digital learning media.",

        id:
          "Seorang anggota kolaboratif dalam THERMPYX yang membantu mewujudkan ide tim menjadi pengalaman belajar interaktif. THERMPYX menjadi salah satu kesempatan pertamanya untuk mengeksplorasi media pembelajaran digital."
      },

      journey: {
        en: [
          "Joined the first four-person THERMPYX development team.",
          "Contributed to the collaborative development of the team's first interactive learning media project.",
          "Continues exploring technology, teamwork, and digital learning media."
        ],

        id: [
          "Bergabung dalam tim pengembang pertama THERMPYX yang terdiri dari empat orang.",
          "Berkontribusi dalam pengembangan kolaboratif proyek media pembelajaran interaktif pertama tim.",
          "Terus mengeksplorasi teknologi, kerja sama tim, dan media pembelajaran digital."
        ]
      },

      socials: [
        {
          label: "Instagram",
          value: "added",
          url: "https://www.instagram.com/yazzchann?stkn=MTE5bXNna24ydGNkbQ== "
        },
        {
          label: "TikTok",
          value: "added",
          url: "https://www.tiktok.com/@dzvanch?_r=1&_t=ZS-9AJr7BVu9G0"
        }
      ]
    },


    {
      nickname: "John",
      fullName: "Zikri Luthfi",
      role: "API & System Development",
      image: "assets/developers/dev-2.jpg",

      motto: {
        en: "Build with logic, improve with purpose.",
        id: "laprakku kau hina, kita batal berzina."
      },

      bio: {
        en:
          "Focused on the technical and logical side of THERMPYX. Through this project, John explores how system logic and web technology can support an interactive educational experience.",

        id:
          "Berfokus pada sisi teknis dan logika THERMPYX. Melalui proyek ini, John mengeksplorasi bagaimana logika sistem dan teknologi web dapat mendukung pengalaman pembelajaran interaktif."
      },

      journey: {
        en: [
          "Started exploring the technical foundation behind THERMPYX.",
          "Contributed to system-oriented development and project logic.",
          "Continues developing technical skills through future digital projects."
        ],

        id: [
          "Mulai mengeksplorasi fondasi teknis di balik THERMPYX.",
          "Berkontribusi pada pengembangan sistem dan logika proyek.",
          "Terus mengembangkan kemampuan teknis melalui proyek digital berikutnya."
        ]
      },

      socials: [
        {
          label: "Instagram",
          value: "added",
          url: "https://www.instagram.com/zikri_luthfi?stkn=b3pjZnRkaG5kMnR1 "
        },
        {
          label: "TikTok",
          value: "Not added",
          url: ""
        }
      ]
    },


    {
      nickname: "Van",
      fullName: "edwart Van djovi",
      role: "Research & Development",
      image: "assets/developers/dev-3.jpg",

      motto: {
        en: "Spicy. ",
        id: "enak. "
      },

      bio: {
        en:
          "Contributes to THERMPYX through exploration, research, and continuous refinement. The project provides an opportunity to experience how scientific ideas can become interactive learning media.",

        id:
          "Berkontribusi dalam THERMPYX melalui eksplorasi, riset, dan penyempurnaan berkelanjutan. Proyek ini menjadi kesempatan untuk melihat bagaimana ide sains dapat diubah menjadi media pembelajaran interaktif."
      },

      journey: {
        en: [
          "Participated in exploring ideas and learning content for THERMPYX.",
          "Supported development through analysis and continuous refinement.",
          "Continues learning from the team's first digital media development experience."
        ],

        id: [
          "Berpartisipasi dalam eksplorasi ide dan konten pembelajaran THERMPYX.",
          "Mendukung pengembangan melalui analisis dan penyempurnaan berkelanjutan.",
          "Terus belajar dari pengalaman pertama tim dalam pengembangan media digital."
        ]
      },

      socials: [
        {
          label: "Instagram",
          value: "added",
          url: "https://www.instagram.com/reiphandy_?utm_source=qr&stkn=bHk0MXB0dmQxY2tk "
        },
        {
          label: "TikTok",
          value: "added",
          url: "https://www.tiktok.com/@coccainnnn?_r=1&_t=ZS-9AJx55gxoMG"
        }
      ]
    },


    {
      nickname: "MISEL CINTA NASPAD",
      fullName: "Misel Natalis Sawato Gulo",
      role: "UI / UX Designer, Frontend Developer",
      image: "assets/developers/dev-4.jpg",

      motto: {
        en: "Design with feeling, create with intention.",
        id: "Mencipta dengan rasa kasih, mencoding dengan sedikit amarah dan emosi."
      },

      bio: {
        en:
          "Focused on visual experience and interface design. Through THERMPYX, Naspad explores how layout, interaction, and visual identity can make scientific learning clearer and more engaging.",

        id:
          "Berfokus pada pengalaman visual dan desain antarmuka. Melalui THERMPYX, Naspad mengeksplorasi bagaimana layout, interaksi, dan identitas visual dapat membuat pembelajaran sains lebih jelas dan menarik."
      },

      journey: {
        en: [
          "Explored visual direction and interface ideas for THERMPYX.",
          "Contributed to an interface that feels modern and connected to the project's identity.",
          "Continues exploring UI/UX and creative digital experiences."
        ],

        id: [
          "Mengeksplorasi arah visual dan ide antarmuka untuk THERMPYX.",
          "Berkontribusi dalam menciptakan antarmuka modern yang sesuai dengan identitas proyek.",
          "Terus mengeksplorasi UI/UX dan pengalaman digital kreatif."
        ]
      },

      socials: [
        {
          label: "Instagram",
          value: "added",
          url: "https://www.instagram.com/misel.gulo?stkn=aDFxMWxneGg5NGlz"
        },
        {
          label: "TikTok",
          value: "added",
          url: "https://www.tiktok.com/@hellow_hellow7?_r=1&_t=ZS-9AJxbRR9VBd"
        }
      ]
    }
  ];


  /* =======================================================
     STATE
  ======================================================= */

  let currentIndex = 0;

  let currentLanguage =
    localStorage.getItem("thermpyx-language") || "en";

  let rotationX = 0;
  let rotationY = 0;

  let startX = 0;
  let startY = 0;

  let startRotationX = 0;
  let startRotationY = 0;

  let dragging = false;


  /* =======================================================
     ELEMENTS
  ======================================================= */

  const elements = {
    nickname:
      document.getElementById("devNickname"),

    fullName:
      document.getElementById("devFullname"),

    role:
      document.getElementById("devRole"),

    motto:
      document.getElementById("devMotto"),

    bio:
      document.getElementById("devBio"),

    history:
      document.getElementById("devHistory"),

    socials:
      document.getElementById("devSocials"),

    selector:
      document.getElementById("devSelector"),

    image:
      document.getElementById("devImage"),

    miniRole:
      document.getElementById("devMiniRole"),

    cardNickname:
      document.getElementById("devCardNickname"),

    cardName:
      document.getElementById("devCardName"),

    teamNumber:
      document.getElementById("devTeamNumber"),

    photoScene:
      document.getElementById("devPhotoScene"),

    photo3D:
      document.getElementById("devPhoto3D"),

    glare:
      document.getElementById("devPhotoGlare"),

    photoNickname:
      document.getElementById("devPhotoNickname"),

    backNickname:
      document.getElementById("devBackNickname"),

    backName:
      document.getElementById("devBackName"),

    backRole:
      document.getElementById("devBackRole"),

    intro:
      document.getElementById("devIntroCopy"),

    aboutLabel:
      document.getElementById("devAboutLabel"),

    journeyLabel:
      document.getElementById("devJourneyLabel"),

    socialLabel:
      document.getElementById("devSocialLabel"),

    rotateHint:
      document.getElementById("devRotateHint"),

    backLink:
      document.getElementById("devBackLink"),

    outroText:
      document.getElementById("devOutroText"),

    rotateLeft:
      document.getElementById("rotateLeft"),

    rotateRight:
      document.getElementById("rotateRight"),

    resetRotation:
      document.getElementById("resetRotation"),

    themeToggle:
      document.getElementById("themeToggle"),

    themeIcon:
      document.getElementById("themeIcon"),

    themeText:
      document.getElementById("themeText")
  };


  /* =======================================================
     MEMBER RENDER
  ======================================================= */

  function renderMember() {
    const member = developers[currentIndex];

    const number =
      String(currentIndex + 1).padStart(2, "0");


    elements.nickname.textContent =
      member.nickname;

    elements.fullName.textContent =
      member.fullName;

    elements.role.textContent =
      member.role;

    elements.motto.textContent =
      member.motto[currentLanguage];

    elements.bio.textContent =
      member.bio[currentLanguage];


    elements.image.src =
      member.image;

    elements.image.alt =
      member.fullName;


    elements.miniRole.textContent =
      member.role;

    elements.cardNickname.textContent =
      member.nickname;

    elements.cardName.textContent =
      member.fullName;

    elements.teamNumber.textContent =
      `TEAM / ${number}`;


    elements.photoNickname.textContent =
      member.nickname;

    elements.backNickname.textContent =
      member.nickname;

    elements.backName.textContent =
      member.fullName;

    elements.backRole.textContent =
      member.role;


    renderHistory(member);

    renderSocials(member);

    updateSelector();

    resetPhotoRotation(false);
  }


  /* =======================================================
     HISTORY
  ======================================================= */

  function renderHistory(member) {
    elements.history.replaceChildren();

    member.journey[currentLanguage].forEach((text) => {
      const item =
        document.createElement("li");

      item.textContent = text;

      elements.history.append(item);
    });
  }


  /* =======================================================
     SOCIAL
  ======================================================= */

  function renderSocials(member) {
    elements.socials.replaceChildren();

    member.socials.forEach((social) => {
      const hasLink =
        Boolean(social.url);

      const element =
        document.createElement(
          hasLink ? "a" : "div"
        );


      element.className =
        "dev-social";


      if (hasLink) {
        element.href = social.url;
        element.target = "_blank";
        element.rel = "noopener noreferrer";
      } else {
        element.classList.add("is-disabled");
      }


      const label =
        document.createElement("span");

      const value =
        document.createElement("small");


      label.textContent =
        social.label;


      value.textContent =
        hasLink
          ? social.value
          : currentLanguage === "id"
            ? "Belum ditambahkan"
            : "Not added";


      element.append(
        label,
        value
      );

      elements.socials.append(element);
    });
  }


  /* =======================================================
     SELECTOR
  ======================================================= */

  function renderSelector() {
    elements.selector.replaceChildren();

    developers.forEach((member, index) => {
      const button =
        document.createElement("button");

      button.type = "button";

      button.className =
        "dev-chip";


      if (index === currentIndex) {
        button.classList.add("is-active");
      }


      const image =
        document.createElement("img");

      image.src =
        member.image;

      image.alt =
        member.fullName;


      const text =
        document.createElement("div");

      text.className =
        "dev-chip-text";


      const nickname =
        document.createElement("strong");

      nickname.textContent =
        member.nickname;


      const fullName =
        document.createElement("small");

      fullName.textContent =
        member.fullName;


      text.append(
        nickname,
        fullName
      );


      button.append(
        image,
        text
      );


      button.addEventListener("click", () => {
        currentIndex = index;

        renderMember();
      });


      elements.selector.append(button);
    });
  }


  function updateSelector() {
    const buttons =
      elements.selector.querySelectorAll(
        ".dev-chip"
      );

    buttons.forEach((button, index) => {
      button.classList.toggle(
        "is-active",
        index === currentIndex
      );
    });
  }


  /* =======================================================
     3D ROTATION
  ======================================================= */

  function applyPhotoRotation() {
    elements.photo3D.style.setProperty(
      "--photo-rotate-x",
      `${rotationX}deg`
    );

    elements.photo3D.style.setProperty(
      "--photo-rotate-y",
      `${rotationY}deg`
    );
  }


  function startDrag(event) {
    dragging = true;

    startX = event.clientX;
    startY = event.clientY;

    startRotationX = rotationX;
    startRotationY = rotationY;


    elements.photoScene.setPointerCapture?.(
      event.pointerId
    );
  }


  function dragPhoto(event) {
    if (!dragging) {
      return;
    }


    const deltaX =
      event.clientX - startX;

    const deltaY =
      event.clientY - startY;


    /*
      Horizontal rotation is unlimited.
      This allows 360°, 720°, etc.
    */

    rotationY =
      startRotationY +
      deltaX * 0.7;


    /*
      Vertical rotation is limited
      so the frame stays comfortable to use.
    */

    rotationX =
      Math.max(
        -18,
        Math.min(
          18,
          startRotationX -
          deltaY * 0.15
        )
      );


    applyPhotoRotation();

    updateGlare(event);
  }


  function stopDrag(event) {
    dragging = false;

    elements.photoScene.releasePointerCapture?.(
      event.pointerId
    );
  }


  function updateGlare(event) {
    if (!elements.glare) {
      return;
    }


    const rect =
      elements.photoScene.getBoundingClientRect();


    const px =
      Math.max(
        0,
        Math.min(
          1,
          (event.clientX - rect.left) /
          rect.width
        )
      );


    const py =
      Math.max(
        0,
        Math.min(
          1,
          (event.clientY - rect.top) /
          rect.height
        )
      );


    elements.glare.style.setProperty(
      "--glare-x",
      `${px * 100}%`
    );

    elements.glare.style.setProperty(
      "--glare-y",
      `${py * 100}%`
    );
  }


  function rotateBy(amount) {
    rotationY += amount;

    applyPhotoRotation();
  }


  function resetPhotoRotation(animate = true) {
    rotationX = 0;
    rotationY = 0;


    if (animate) {
      elements.photo3D.style.transition =
        "transform 0.5s cubic-bezier(.2,.8,.2,1)";
    }


    applyPhotoRotation();


    if (animate) {
      window.setTimeout(() => {
        elements.photo3D.style.transition =
          "transform 0.12s ease-out";
      }, 520);
    }
  }


  /* =======================================================
     LANGUAGE
  ======================================================= */

  function setLanguage(language) {
    currentLanguage = language;

    localStorage.setItem(
      "thermpyx-language",
      language
    );


    document.documentElement.lang =
      language;


    document
      .querySelectorAll(".dev-language")
      .forEach((button) => {
        button.classList.toggle(
          "is-active",
          button.dataset.language === language
        );
      });


    if (language === "id") {
      elements.intro.textContent =
        "Tim kolaboratif yang terdiri dari empat mahasiswa yang mengembangkan website pembelajaran termodinamika interaktif pertama mereka.";

      elements.aboutLabel.textContent =
        "TENTANG";

      elements.journeyLabel.textContent =
        "PERJALANAN / RIWAYAT";

      elements.socialLabel.textContent =
        "MEDIA SOSIAL";

      elements.rotateHint.textContent =
        "GESER / SENTUH UNTUK MEMUTAR 360°";

      elements.backLink.textContent =
        "Kembali ke Tentang";

      elements.outroText.textContent =
        "Empat pemikiran yang bekerja bersama untuk membuat termodinamika lebih interaktif, visual, dan menarik.";

      elements.themeText.textContent =
        document.body.classList.contains("light-mode")
          ? "Mode Gelap"
          : "Mode Terang";
    } else {
      elements.intro.textContent =
        "A collaborative team of four students building their first interactive thermodynamics learning website.";

      elements.aboutLabel.textContent =
        "ABOUT";

      elements.journeyLabel.textContent =
        "JOURNEY / HISTORY";

      elements.socialLabel.textContent =
        "SOCIAL MEDIA";

      elements.rotateHint.textContent =
        "DRAG / TOUCH TO ROTATE 360°";

      elements.backLink.textContent =
        "Back to About";

      elements.outroText.textContent =
        "Four minds working together to make thermodynamics more interactive, visual, and engaging.";

      elements.themeText.textContent =
        document.body.classList.contains("light-mode")
          ? "Dark Mode"
          : "Light Mode";
    }


    renderMember();
  }


  /* =======================================================
     THEME
  ======================================================= */

  function setTheme(mode) {
    const light =
      mode === "light";


    document.body.classList.toggle(
      "light-mode",
      light
    );


    document.documentElement.dataset.theme =
      mode;


    localStorage.setItem(
      "thermpyx-theme",
      mode
    );


    elements.themeIcon.textContent =
      light ? "☾" : "☀";


    if (currentLanguage === "id") {
      elements.themeText.textContent =
        light
          ? "Mode Gelap"
          : "Mode Terang";
    } else {
      elements.themeText.textContent =
        light
          ? "Dark Mode"
          : "Light Mode";
    }


    window.dispatchEvent(
      new CustomEvent(
        "thermpyx:themechange",
        {
          detail: { mode }
        }
      )
    );
  }


  /* =======================================================
     EVENTS
  ======================================================= */

  elements.photoScene.addEventListener(
    "pointerdown",
    startDrag
  );


  elements.photoScene.addEventListener(
    "pointermove",
    dragPhoto
  );


  elements.photoScene.addEventListener(
    "pointerup",
    stopDrag
  );


  elements.photoScene.addEventListener(
    "pointercancel",
    stopDrag
  );


  elements.photoScene.addEventListener(
    "dblclick",
    () => resetPhotoRotation()
  );


  elements.rotateLeft.addEventListener(
    "click",
    () => rotateBy(-90)
  );


  elements.rotateRight.addEventListener(
    "click",
    () => rotateBy(90)
  );


  elements.resetRotation.addEventListener(
    "click",
    () => resetPhotoRotation()
  );


  document
    .querySelectorAll(".dev-language")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          setLanguage(
            button.dataset.language
          );
        }
      );
    });


  elements.themeToggle.addEventListener(
    "click",
    () => {
      const current =
        document.body.classList.contains(
          "light-mode"
        )
          ? "light"
          : "dark";


      setTheme(
        current === "light"
          ? "dark"
          : "light"
      );
    }
  );


  /* =======================================================
     INITIALIZE
  ======================================================= */

  const initialTheme =
    localStorage.getItem(
      "thermpyx-theme"
    ) || "dark";


  setTheme(initialTheme);

  renderSelector();

  setLanguage(currentLanguage);

})();