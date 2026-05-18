import { motion } from 'framer-motion';

import logo from '../../assets/project-logo.svg';

export function SplashScreen() {
  return (
    <motion.section
      className="qr-splash-screen"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.38, ease: 'easeInOut' }}
      aria-label="Loading Foodyply menu"
    >
      <motion.div
        className="qr-splash-logo"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <img src={logo} alt="Foodyply" />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        FOODY<span>PLY</span>
      </motion.h1>
    </motion.section>
  );
}
