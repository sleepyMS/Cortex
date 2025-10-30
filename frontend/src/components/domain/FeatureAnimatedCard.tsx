"use client";

import { motion, Variants } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

// Variants 타입을 명시적으로 지정
const cardVariants: Variants = {
  hidden: { y: 50, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "tween", duration: 0.5, ease: "easeOut" },
  },
};

interface FeatureAnimatedCardProps {
  index: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}

/** FeatureSection의 개별 카드를 감싸는 애니메이션 클라이언트 컴포넌트 */
export const FeatureAnimatedCard = ({
  index,
  icon,
  title,
  description,
}: FeatureAnimatedCardProps) => {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      transition={{ delay: index * 0.1 }}
      className="h-full" // div가 Card의 높이를 100% 차지하도록
    >
      <Card className="h-full hover:border-violet-500/50 hover:bg-white/10 transition-colors duration-300">
        <CardHeader>
          {icon}
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
};
