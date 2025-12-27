"use client";

import React from "react";
import { StatisticsCounter } from "./StatisticsCounter";
import { AILabSection } from "./sections/AILabSection";
import { StrategyBuilderSection } from "./sections/StrategyBuilderSection";
import { OptimizationSection } from "./sections/OptimizationSection";
import { BacktestingSection } from "./sections/BacktestingSection";
import { IntegrationGridSection } from "./sections/IntegrationGridSection";
import { TechStackShowcase } from "./TechStackShowcase";

interface ScrollFeatureShowcaseProps {
  translations: {
    sectionLabel: string;
    sectionTitle: string;
    sectionSubtitle: string;
    statistics: {
      aiLab: string;
      strategyBuilder: string;
      optimization: string;
      backtesting: string;
      infrastructure: string;
    };
    features: {
      aiLab: {
        badge: string;
        title: string;
        description: string;
        highlights: string[];
        cta: string;
      };
      strategyBuilder: {
        badge: string;
        title: string;
        description: string;
        highlights: string[];
        cta: string;
      };
      aiOptimization: {
        badge: string;
        title: string;
        description: string;
        highlights: string[];
        cta: string;
      };
      tickBacktesting: {
        badge: string;
        title: string;
        description: string;
        highlights: string[];
        cta: string;
      };
      exchangeConnectivity: { title: string; description: string };
      security: { title: string; description: string };
      community: { title: string; description: string };
    };
    techStack: {
      title: string;
    };
  };
}

export const ScrollFeatureShowcase: React.FC<ScrollFeatureShowcaseProps> = ({
  translations,
}) => {
  return (
    <div className="relative">
      {/* Statistics Counter Banner */}
      <StatisticsCounter translations={translations.statistics} />

      {/* AI Lab Section - Primary Feature */}
      <AILabSection translations={translations.features.aiLab} />

      {/* Strategy Builder Section */}
      <StrategyBuilderSection
        translations={translations.features.strategyBuilder}
      />

      {/* Optimization Section */}
      <OptimizationSection
        translations={translations.features.aiOptimization}
      />

      {/* Backtesting Section */}
      <BacktestingSection
        translations={translations.features.tickBacktesting}
      />

      {/* Integration Grid */}
      <IntegrationGridSection
        exchangeTranslations={translations.features.exchangeConnectivity}
        securityTranslations={translations.features.security}
        tradingTranslations={translations.features.community}
      />

      {/* Tech Stack Showcase */}
      <TechStackShowcase title={translations.techStack.title} />
    </div>
  );
};

export default ScrollFeatureShowcase;
