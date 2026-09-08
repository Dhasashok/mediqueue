export const personalInfo = {
  name: "Ashok Rohidas Dhas",
  shortName: "Ashok Dhas",
  initials: "AD",
  title: "Software Developer | Full Stack Developer",
  location: "Pune, Maharashtra, India",
  email: "ashokdhas6566@gmail.com",
  phone: "+91 90667 76566",
  phoneRaw: "+919066776566",
  linkedin: "https://www.linkedin.com/in/ashok-dhas-849664377/",
  github: "", // Left empty as per instruction not to invent URLs
  resumeUrl: "/Ashok_Rohidas_Dhas_Resume.pdf",
  availability: "Open for SDE & Full Stack Opportunities",
  college: "Genba Sopanrao Moze College of Engineering, Pune (GSMCOE)",
  degree: "B.E. Computer Engineering",
  cgpa: "8.50 / 10",
  careerTargets: [
    "Software Development Engineer (SDE)",
    "Full Stack Developer",
    "Software Developer"
  ],
  heroRoles: [
    "Software Developer",
    "Full Stack Developer",
    "Java Developer",
    "React.js Developer",
    "Node.js Developer"
  ],
  heroBio: "B.E. Computer Engineering graduate with hands-on experience building full-stack web applications using Java, JavaScript, React.js, Node.js, Express.js, and MySQL.",
  aboutBio: [
    "I am a B.E. Computer Engineering graduate from Genba Sopanrao Moze College of Engineering, Pune, with a CGPA of 8.50/10. I have hands-on experience in Java, JavaScript, React.js, Node.js, Express.js, and MySQL, along with practical exposure to full-stack web development.",
    "I enjoy building practical software solutions, designing responsive interfaces, developing REST APIs, integrating databases, and solving real-world problems through technology.",
    "I am currently seeking Software Development Engineer and Full Stack Developer opportunities where I can contribute my programming and problem-solving skills while continuing to grow as a software engineer."
  ],
  stats: [
    { label: "CGPA", value: "8.50", subtext: "SPPU Pune" },
    { label: "Internships", value: "2", subtext: "Web & Full Stack" },
    { label: "Major Full-Stack Projects", value: "2", subtext: "Production Ready" },
    { label: "REST APIs", value: "40+", subtext: "Engineered & Tested" }
  ]
};

export const servicesData = [
  {
    id: "full-stack",
    title: "Full Stack Web Development",
    description: "Building complete web applications with React.js, Node.js, Express.js, REST APIs and MySQL.",
    badge: "End-to-End",
    technologies: ["React.js", "Node.js", "Express.js", "MySQL", "REST API"],
    color: "purple"
  },
  {
    id: "frontend",
    title: "Frontend Development",
    description: "Creating responsive, interactive and user-friendly interfaces using React.js, HTML, CSS and JavaScript.",
    badge: "UI/UX & SPAs",
    technologies: ["React.js", "JavaScript ES6+", "HTML5", "CSS3", "Tailwind CSS"],
    color: "blue"
  },
  {
    id: "backend",
    title: "Backend Development",
    description: "Developing REST APIs, authentication systems, role-based access control and backend workflows using Node.js and Express.js.",
    badge: "Scalable APIs",
    technologies: ["Node.js", "Express.js", "JWT Auth", "RBAC", "Socket.io"],
    color: "green"
  },
  {
    id: "database",
    title: "API & Database Integration",
    description: "Designing APIs and integrating applications with MySQL and cloud database environments.",
    badge: "Architecture",
    technologies: ["MySQL", "TiDB Cloud", "Database Design", "Postman", "Workbench"],
    color: "orange"
  }
];

export const skillsData = [
  {
    category: "LANGUAGES",
    icon: "Code2",
    accent: "purple",
    skills: ["Java", "JavaScript ES6+", "SQL"]
  },
  {
    category: "FRONTEND",
    icon: "Layout",
    accent: "blue",
    skills: ["React.js", "HTML", "CSS"]
  },
  {
    category: "BACKEND",
    icon: "Server",
    accent: "green",
    skills: ["Node.js", "Express.js", "REST API", "JWT Authentication", "Socket.io"]
  },
  {
    category: "DATABASE",
    icon: "Database",
    accent: "orange",
    skills: ["MySQL", "Database Design", "MySQL Workbench"]
  },
  {
    category: "TOOLS",
    icon: "Wrench",
    accent: "pink",
    skills: ["Git", "GitHub", "VS Code", "Postman"]
  },
  {
    category: "CONCEPTS",
    icon: "Cpu",
    accent: "indigo",
    skills: ["OOP", "SDLC", "DBMS", "Software Development", "API Integration"]
  }
];

export const experienceData = [
  {
    id: "motioncut",
    company: "MotionCut Pvt. Ltd.",
    role: "Web Development Intern",
    period: "Jan 2025 – Feb 2025",
    location: "Remote",
    type: "Internship",
    technologies: ["HTML", "CSS", "JavaScript"],
    responsibilities: [
      "Created responsive web pages using HTML, CSS, and JavaScript with cross-device compatibility.",
      "Enhanced interactive UI features using JavaScript DOM manipulation.",
      "Completed assigned development tasks within the internship timeline."
    ]
  },
  {
    id: "sgms",
    company: "SGMS Infotech LLP",
    role: "Full Stack Developer Intern",
    period: "Jul 2024 – Aug 2024",
    location: "Pune, India",
    type: "Internship",
    technologies: ["Frontend Development", "Backend Development", "Full Stack Development"],
    responsibilities: [
      "Participated in web development tasks across multiple application modules.",
      "Gained practical exposure to frontend and backend development workflows.",
      "Assisted the development team with assigned tasks and project modules."
    ]
  }
];

export const projectsData = [
  {
    id: "royal-orchid",
    featured: true,
    title: "Royal Orchid – PG Management System",
    category: "Full Stack Web Application",
    tagline: "Comprehensive Accommodation & Tenant Operations Management Platform",
    description: "Built an intuitive full-stack PG management solution with specialized modules for tenant management, room allocation, payments, and complaints.",
    technologies: ["React.js", "Node.js", "Express.js", "TiDB Cloud", "Vercel", "Render", "TestSprite"],
    stats: [
      { label: "Manual Time Saved", value: "15 hrs/wk" },
      { label: "REST APIs", value: "40+" },
      { label: "Security", value: "JWT + RBAC" },
      { label: "Cloud DB", value: "TiDB Cloud" }
    ],
    achievements: [
      "Improved administrative workflow efficiency.",
      "Reduced time spent on manual tasks by approximately 15 hours weekly.",
      "Engineered 40+ REST APIs.",
      "Implemented JWT authentication and RBAC (Role-Based Access Control).",
      "Implemented real-time bed allocation and occupancy tracking.",
      "Added payment workflows and automated ledger records.",
      "Deployed using Vercel, Render, and TiDB Cloud for seamless uptime.",
      "Conducted application and API testing using TestSprite."
    ],
    architecture: {
      frontend: "React.js dynamic client with modular component design and responsive dashboards.",
      backend: "Node.js & Express.js REST API layer handling 40+ secure endpoints.",
      database: "TiDB Cloud distributed SQL database with relational schema design.",
      security: "JSON Web Tokens (JWT) for stateless sessions with granular role-based authorization.",
      testing: "Comprehensive API and interface verification using TestSprite."
    },
    githubUrl: null,
    liveUrl: "https://pgmanagement-frontend.vercel.app/",
    image: "/projects/royal-orchid-preview.png",
    screenshots: [
      {
        url: "/projects/royal-orchid-preview.png",
        title: "Live Portal & Bed Availability",
        caption: "Royal Orchid PG resident portal with interactive bed explorer, amenities, and security overview."
      }
    ],
    videoUrl: null // Add video path like "/projects/royal-orchid-demo.mp4" or Loom/YouTube embed
  },
  {
    id: "mediqueue",
    featured: false,
    title: "MediQueue – Hospital Queue Management System",
    category: "Full Stack Healthcare Solution",
    period: "2025 – 2026",
    tagline: "Smart OPD Queue & Patient Flow Optimization System",
    description: "Built a full-stack hospital OPD management system with dedicated Patient, Doctor, and Admin dashboards.",
    technologies: ["React.js", "Node.js", "Express.js", "MySQL", "Socket.io", "JWT", "Nodemailer"],
    stats: [
      { label: "Dashboards", value: "3 Roles" },
      { label: "Real-Time Engine", value: "Socket.io" },
      { label: "Verification", value: "OTP + JWT" },
      { label: "Check-in", value: "QR Enabled" }
    ],
    features: [
      "Patient dashboard for token generation and queue status monitoring",
      "Doctor dashboard for patient consultation and digital prescription management",
      "Admin dashboard for OPD schedule and hospital staff oversight",
      "Robust REST APIs for seamless frontend-backend communication",
      "JWT authentication and OTP verification for secure login",
      "Role-based access control (RBAC) across all portal endpoints",
      "Socket.io real-time queue updates without manual page refreshes",
      "QR-based patient check-in at reception counters",
      "Digital prescription management and automated hospital workflows"
    ],
    architecture: {
      frontend: "React.js with multi-role views, live queue visualizers, and digital prescription creation.",
      backend: "Node.js & Express.js with Socket.io WebSockets for live status synchronization.",
      database: "MySQL relational database for patient records, appointments, and prescriptions.",
      communication: "Nodemailer for automated email notifications, token alerts, and OTP verification."
    },
    githubUrl: null,
    liveUrl: null,
    image: null,
    screenshots: [],
    videoUrl: null // Add video path like "/projects/mediqueue-demo.mp4" or Loom/YouTube embed
  }
];

export const educationData = [
  {
    id: "be",
    institution: "Genba Sopanrao Moze College of Engineering, Pune (GSMCOE)",
    location: "Balewadi, Pune",
    degree: "B.E. Computer Engineering",
    university: "SPPU, Pune",
    period: "2023 – 2026",
    grade: "CGPA: 8.50 / 10",
    highlight: "First Class with Distinction",
    status: "Completed / Final Year"
  },
  {
    id: "diploma",
    institution: "Government Polytechnic Awasari, Pune",
    location: "Pune, Maharashtra",
    degree: "Diploma in Computer Engineering",
    period: "2021 – 2023",
    grade: "Aggregate: 84.46%",
    highlight: "Distinction",
    status: "Completed"
  },
  {
    id: "hsc",
    institution: "Mahatma Gandhi Vidyalaya, Karjat",
    location: "Karjat, Maharashtra",
    degree: "Class XII – Higher Secondary Certificate (HSC)",
    period: "2019 – 2021",
    grade: "72.00%",
    highlight: "First Class",
    status: "Completed"
  },
  {
    id: "ssc",
    institution: "Nivruttirao Dhas Madyamik Vidyalaya, Jamgaon",
    location: "Jamgaon, Beed, Maharashtra",
    degree: "Class X – Secondary School Certificate (SSC)",
    period: "2018 – 2019",
    grade: "92.00%",
    highlight: "Distinction",
    status: "Completed"
  }
];

export const certificationsData = [
  {
    id: "qspiders",
    title: "Java Full Stack Development",
    issuer: "QSpiders, Pune",
    year: "2026",
    skills: ["Java", "Full Stack Development", "SQL", "Web Technologies", "OOP"],
    badge: "Full Stack"
  },
  {
    id: "iit-bombay",
    title: "Java Programming Tutorial",
    issuer: "IIT Bombay – Spoken Tutorial",
    year: "2023",
    skills: ["Core Java", "Object-Oriented Programming", "Algorithm Design"],
    badge: "Core Programming"
  },
  {
    id: "udemy",
    title: "React Native – Complete Guide",
    issuer: "Udemy",
    year: "Course Completed",
    skills: ["React Native", "Mobile UI Components", "State Management", "Cross-Platform"],
    badge: "Mobile & Frontend"
  }
];

export const navLinks = [
  { name: "Home", href: "#home" },
  { name: "About", href: "#about" },
  { name: "Experience", href: "#experience" },
  { name: "Projects", href: "#projects" },
  { name: "Skills", href: "#skills" },
  { name: "Contact", href: "#contact" }
];
