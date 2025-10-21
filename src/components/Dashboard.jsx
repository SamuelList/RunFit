import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, SegmentedControl } from './ui';
import { OutfitRecommendation, BestRunTimeCard } from './running';
import OutfitItem from './running/OutfitItem';
import { PerformanceScore } from './performance';
import { ForecastCard } from './weather';
import { useAppContext } from './context/AppContext';
import CopyWeatherButton from './ui/CopyWeatherButton';
import GeminiButton from './ui/GeminiButton';
import { Sparkles } from 'lucide-react';

const Dashboard = () => {
    const [aiResult, setAiResult] = useState({ data: null, loading: false, error: null });
    const {
        derived,
        wx,
        staggerContainer,
        cardVariants,
        listItemVariants,
        optionsDiffer,
        activeOption,
        setActiveOption,
        runType,
        optionTitle,
        activeItems,
        GEAR_INFO,
        GEAR_ICONS,
        UserRound,
        setSelectedOutfitItem,
        Info,
        Flame,
        TrendingUp,
        Hand,
        getDisplayedScore,
        runnerBoldness,
        unit,
        isEvening,
        showTomorrowOutfit,
        tomorrowRunHour,
        tomorrowCardRunType,
        tomorrowCardOption,
        setTomorrowCardRunType,
        setTomorrowRunType,
        setTomorrowCardOption,
        setShowTimePickerModal,
        outfitFor,
        scoreLabel,
        scoreBasedTone,
        coldHands,
        gender,
        tempSensitivity,
        displayedScoreProps,
        gaugeData,
        setShowInsights,
    } = useAppContext();

    return (
        <motion.div
            className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
        >
            {/* Left Column */}
            <motion.div className="flex flex-col gap-6 lg:col-start-1" variants={cardVariants}>
                <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-br from-gray-50/50 to-white dark:from-slate-900/50 dark:to-slate-900">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                                <CardTitle className="text-base">{optionTitle}</CardTitle>
                            </div>
                            <SegmentedControl
                                value={activeOption}
                                onChange={setActiveOption}
                                options={[
                                    { label: "Performance", value: "A" },
                                    { label: "Comfort", value: "B" },
                                    { label: "A.I. (beta)", value: "C" },
                                ]}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        {derived ? (
                            <>
                                {activeOption === 'C' ? (
                                    <motion.div
                                        key="C"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="space-y-4"
                                    >
                                        <GeminiButton 
                                            derived={derived} 
                                            wx={wx} 
                                            unit={unit} 
                                            gender={gender} 
                                            runType={runType} 
                                            tempSensitivity={tempSensitivity}
                                            onResultChange={setAiResult}
                                        />
                                        
                                        {aiResult.loading && (
                                            <div className="space-y-2">
                                                {[1, 2, 3, 4].map((i) => (
                                                    <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800/40" />
                                                ))}
                                            </div>
                                        )}
                                        
                                        {aiResult.error && (
                                            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                                                <p className="text-sm text-red-800 dark:text-red-200">{aiResult.error}</p>
                                            </div>
                                        )}
                                        
                                        {!aiResult.loading && aiResult.mapped && aiResult.mapped.length > 0 && (
                                            <motion.div
                                                className="space-y-2"
                                                variants={staggerContainer}
                                                initial="initial"
                                                animate="animate"
                                            >
                                                {aiResult.mapped.map((item) => (
                                                    <OutfitItem
                                                        key={item.key}
                                                        item={{
                                                            key: item.key,
                                                            label: item.name,
                                                            isAiSuggested: true
                                                        }}
                                                        listItemVariants={listItemVariants}
                                                        onClick={() => setSelectedOutfitItem(item.key)}
                                                    />
                                                ))}
                                            </motion.div>
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        className="space-y-2"
                                        variants={staggerContainer}
                                        initial="initial"
                                        animate="animate"
                                    >
                                        {activeItems.map((item) => (
                                            <motion.div
                                                key={item.key}
                                                className="group relative rounded-xl border border-gray-200/60 dark:border-slate-700/60 bg-gradient-to-br from-white to-gray-50/30 dark:from-slate-800/40 dark:to-slate-900/40 px-4 py-3 transition-all hover:shadow-sm hover:border-gray-300 dark:hover:border-slate-600 cursor-pointer"
                                                variants={listItemVariants}
                                                whileHover={{ x: 4, transition: { duration: 0.2 } }}
                                                onClick={() => setSelectedOutfitItem(item.key)}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        {(() => {
                                                            const gearInfo = GEAR_INFO[item.key];
                                                            const Icon = GEAR_ICONS[item.key] || UserRound;
                                                            return gearInfo?.image ? (
                                                                <img
                                                                    src={gearInfo.image}
                                                                    alt={item.label}
                                                                    className="h-10 w-10 rounded-lg object-cover"
                                                                />
                                                            ) : (
                                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-700">
                                                                    <Icon className="h-5 w-5 text-gray-600 dark:text-slate-300" />
                                                                </div>
                                                            );
                                                        })()}
                                                        <span className="text-sm font-semibold text-gray-800 dark:text-slate-100">{item.label}</span>
                                                    </div>
                                                    {(item.coldHands || item.workout || item.longRun) && (
                                                        <div className="flex items-center gap-1">
                                                            {item.workout && (
                                                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/60 dark:border-amber-500/40 bg-amber-50/80 dark:bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                                                                    <Flame className="h-3 w-3" /> Workout
                                                                </span>
                                                            )}
                                                            {item.longRun && (
                                                                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200/60 dark:border-indigo-500/40 bg-indigo-50/80 dark:bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:text-indigo-300">
                                                                    <TrendingUp className="h-3 w-3" /> Long
                                                                </span>
                                                            )}
                                                            {item.coldHands && (
                                                                <span className="inline-flex items-center gap-1 rounded-full border border-sky-200/60 dark:border-sky-500/40 bg-sky-50/80 dark:bg-sky-500/20 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">
                                                                    <Hand className="h-3 w-3" /> Cold
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                )}

                                {!optionsDiffer ? (
                                    <motion.div
                                        className="mt-4 rounded-xl border border-emerald-200/60 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 px-4 py-3"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 dark:bg-emerald-500/30 mt-0.5">
                                                <svg className="h-3 w-3 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <p className="text-sm font-semibold">Perfect alignment! Performance and comfort recommendations match today—this outfit optimizes both.</p>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        className="mt-4 rounded-xl border border-blue-200/60 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 px-4 py-3"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <div className="flex items-start gap-2">
                                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                                            <p className="text-sm font-semibold leading-relaxed text-blue-800 dark:text-blue-200">
                                                {activeOption === "A"
                                                    ? "Performance-focused: Optimized for speed and efficiency. May sacrifice some warmth/comfort."
                                                    : "Comfort-focused: Prioritizes warmth and protection. May feel slightly overdressed during hard efforts."}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </>
                        ) : (
                            <div className="space-y-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800/40" />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Run Strategy Card - AI or Default */}
                {(aiResult.data || derived?.approach) && (
                    <Card className="overflow-hidden">
                        <CardHeader className="bg-gradient-to-br from-sky-50/50 to-blue-50/50 dark:from-sky-900/20 dark:to-blue-900/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-500">
                                        {aiResult.data ? <Sparkles className="h-4 w-4 text-white" /> : <Flame className="h-4 w-4 text-white" />}
                                    </div>
                                    <CardTitle className="text-base">
                                        {aiResult.data ? 'AI Run Strategy' : `${runType === 'easy' ? 'Easy Run' : runType === 'workout' ? 'Hard Workout' : 'Long Run'} Strategy`}
                                    </CardTitle>
                                </div>
                                {!aiResult.data && derived?.roadConditions?.hasWarnings && (
                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${derived.roadConditions.severity === 'danger'
                                            ? 'border-red-300 bg-red-100 text-red-800 dark:border-red-500/40 dark:bg-red-500/20 dark:text-red-200'
                                            : derived.roadConditions.severity === 'warning'
                                                ? 'border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-500/40 dark:bg-orange-500/20 dark:text-orange-200'
                                                : 'border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-500/40 dark:bg-yellow-500/20 dark:text-yellow-200'
                                        }`}>
                                        ⚠️ Road Alert
                                    </span>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            {aiResult.data ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <div className="whitespace-pre-wrap text-sm text-gray-800 dark:text-slate-200 leading-relaxed">
                                        {(() => {
                                            // Extract Run Strategy section from AI output
                                            const strategyMatch = aiResult.data.match(/##?\s*Run\s+Strategy[:\s]*(.*?)(?=##|$)/is);
                                            if (strategyMatch && strategyMatch[1]) {
                                                return strategyMatch[1].trim();
                                            }
                                            // Fallback: look for strategy without header
                                            const lines = aiResult.data.split('\n');
                                            const strategyStart = lines.findIndex(l => /run\s+strategy/i.test(l));
                                            if (strategyStart >= 0) {
                                                const nextSection = lines.slice(strategyStart + 1).findIndex(l => /^#+/.test(l));
                                                const endIdx = nextSection >= 0 ? strategyStart + 1 + nextSection : lines.length;
                                                return lines.slice(strategyStart + 1, endIdx).join('\n').trim();
                                            }
                                            return 'No run strategy found in AI output.';
                                        })()}
                                    </div>
                                </div>
                            ) : derived?.approach ? (
                                <div className="space-y-3">
                                    {derived.approach.tips.map((tip, idx) => {
                                        const isRoadWarning = tip.startsWith('⚠️');
                                        return (
                                            <motion.div
                                                key={idx}
                                                className={`flex items-start gap-2 rounded-lg border p-3 ${isRoadWarning
                                                        ? derived.roadConditions.severity === 'danger'
                                                            ? 'border-red-300/60 bg-red-50/80 dark:border-red-500/30 dark:bg-red-500/10'
                                                            : derived.roadConditions.severity === 'warning'
                                                                ? 'border-orange-300/60 bg-orange-50/80 dark:border-orange-500/30 dark:bg-orange-500/10'
                                                                : 'border-yellow-300/60 bg-yellow-50/80 dark:border-yellow-500/30 dark:bg-yellow-500/10'
                                                        : 'border-sky-200/40 bg-white/60 dark:border-sky-800/40 dark:bg-slate-900/40'
                                                    }`}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                            >
                                                {derived.approach.tips.length > 2 && !isRoadWarning && (
                                                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-500/20">
                                                        <span className="text-xs font-bold text-sky-700 dark:text-sky-400">{idx + 1}</span>
                                                    </div>
                                                )}
                                                <p className={`text-sm leading-relaxed ${isRoadWarning
                                                        ? 'text-gray-900 dark:text-slate-100 font-medium'
                                                        : 'text-gray-800 dark:text-slate-200'
                                                    }`}>
                                                    {tip}
                                                </p>
                                            </motion.div>
                                        );
                                    })}

                                    <motion.div
                                        className="mt-4 rounded-lg border border-indigo-200/60 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-500/10 p-3"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: derived.approach.tips.length * 0.1 }}
                                    >
                                        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Pace Guidance</div>
                                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-slate-100">{derived.approach.paceAdj}</p>
                                    </motion.div>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                )}

                <ForecastCard derived={derived} getDisplayedScore={getDisplayedScore} runnerBoldness={runnerBoldness} className="lg:hidden" />
                <BestRunTimeCard derived={derived} unit={unit} getDisplayedScore={getDisplayedScore} runnerBoldness={runnerBoldness} className="lg:hidden" />

            </motion.div>

            {/* Center Column */}
            <PerformanceScore
                displayedScoreProps={displayedScoreProps}
                gaugeData={gaugeData}
                setShowInsights={setShowInsights}
                wx={wx}
                derived={derived}
                unit={unit}
                staggerContainer={staggerContainer}
                listItemVariants={listItemVariants}
                cardVariants={cardVariants}
            />

            <motion.div variants={cardVariants}>
                <ForecastCard derived={derived} getDisplayedScore={getDisplayedScore} runnerBoldness={runnerBoldness} className="lg:col-start-3 hidden lg:block" />
                <BestRunTimeCard derived={derived} unit={unit} getDisplayedScore={getDisplayedScore} runnerBoldness={runnerBoldness} className="lg:col-start-3 hidden lg:block" />
            </motion.div>
        </motion.div>
    );
};

export default Dashboard;
