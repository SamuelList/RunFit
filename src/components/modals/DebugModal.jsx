import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button, Input, Switch, Label } from '../ui';

const backdropVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
};

const modalVariants = {
    initial: { opacity: 0, scale: 0.9, y: 50 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.9, y: 50, transition: { duration: 0.2 } },
};

export const DebugModal = ({
    isOpen,
    onClose,
    unit,
    debugActive,
    onClearScenario,
    onApplyScenario,
    initialData,
}) => {
    const [inputs, setInputs] = useState(initialData);

    useEffect(() => {
        if (isOpen) {
            setInputs(initialData);
        }
    }, [isOpen, initialData]);

    const handleInputChange = (field) => (event) => {
        const value = event?.target?.value ?? '';
        setInputs((prev) => ({ ...prev, [field]: value }));
    };

    const handleSwitchChange = (field) => (val) => {
        setInputs((prev) => ({ ...prev, [field]: val }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 p-4"
                    onClick={onClose}
                    variants={backdropVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                >
                    <motion.div
                        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-amber-500/40 bg-gradient-to-br from-white to-amber-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                        variants={modalVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-amber-200/60 bg-white/95 px-4 py-3 dark:border-amber-500/30 dark:bg-slate-900/95 backdrop-blur-sm">
                            <div>
                                <h2 className="text-base font-semibold text-amber-800 dark:text-amber-200 sm:text-lg">Debug scenario builder</h2>
                                <p className="text-[10px] text-amber-600 dark:text-amber-300/80 sm:text-xs">Override the current weather to test edge cases. Values are in °{unit}.</p>
                            </div>
                            <motion.button
                                onClick={onClose}
                                className="rounded-lg p-1.5 text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-500/10 sm:p-2"
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <X className="h-4 w-4 sm:h-5 sm:w-5" />
                            </motion.button>
                        </div>
                        <div className="space-y-4 px-4 py-4 sm:space-y-6 sm:px-6 sm:py-6">
                            <div className="rounded-lg border border-sky-200/60 bg-sky-50/50 p-2.5 dark:border-sky-500/30 dark:bg-sky-500/10 sm:p-3">
                                <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-sky-700 dark:text-sky-300 sm:text-xs">Quick presets</div>
                                <div className="space-y-2">
                                    <div>
                                        <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 sm:text-[10px]">Ideal Conditions</div>
                                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setInputs({ apparent: "50", temp: "52", wind: "3", humidity: "45", precipProb: "0", precipIn: "0", uvIndex: "4", cloudCover: "30", pressure: "1015", solarRadiation: "250", isDay: true, debugTimeHour: "" })}
                                                className="text-xs bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:border-emerald-700 dark:text-emerald-300"
                                            >
                                                ⭐ PR Weather (WBGT ~60°F)
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setInputs({ apparent: "45", temp: "46", wind: "5", humidity: "50", precipProb: "0", precipIn: "0", uvIndex: "3", cloudCover: "40", pressure: "1012", solarRadiation: "200", isDay: true, debugTimeHour: "" })}
                                                className="text-xs"
                                            >
                                                🏃 Marathon Ideal
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 sm:text-[10px]">Warm/Caution (WBGT 65-73°F)</div>
                                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setInputs({ apparent: "68", temp: "70", wind: "6", humidity: "65", precipProb: "0", precipIn: "0", uvIndex: "7", cloudCover: "25", pressure: "1010", solarRadiation: "650", isDay: true, debugTimeHour: "" })}
                                                className="text-xs"
                                            >
                                                ⚡ WBGT 68°F
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setInputs({ apparent: "70", temp: "72", wind: "4", humidity: "72", precipProb: "0", precipIn: "0", uvIndex: "8", cloudCover: "15", pressure: "1008", solarRadiation: "750", isDay: true, debugTimeHour: "" })}
                                                className="text-xs"
                                            >
                                                ⚡ WBGT 72°F (Yellow Flag)
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400 sm:text-[10px]">Hot/High Risk (WBGT 73-82°F)</div>
                                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setInputs({ apparent: "78", temp: "80", wind: "5", humidity: "75", precipProb: "0", precipIn: "0", uvIndex: "9", cloudCover: "10", pressure: "1005", solarRadiation: "850", isDay: true, debugTimeHour: "" })}
                                                className="text-xs"
                                            >
                                                🔥 WBGT 76°F (Red Flag)
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setInputs({ apparent: "82", temp: "84", wind: "3", humidity: "78", precipProb: "0", precipIn: "0", uvIndex: "10", cloudCover: "5", pressure: "1003", solarRadiation: "900", isDay: true, debugTimeHour: "" })}
                                                className="text-xs"
                                            >
                                                🔥 WBGT 81°F
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-rose-900 dark:text-rose-300 sm:text-[10px]">Extreme Heat (WBGT {'>'}82°F)</div>
                                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setInputs({ apparent: "88", temp: "90", wind: "2", humidity: "80", precipProb: "0", precipIn: "0", uvIndex: "11", cloudCover: "0", pressure: "1000", solarRadiation: "950", isDay: true, debugTimeHour: "" })}
                                                className="text-xs bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100 dark:bg-rose-950/50 dark:border-rose-700 dark:text-rose-300"
                                            >
                                                🚨 WBGT 86°F (Black Flag)
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400 sm:text-[10px]">Cold Conditions</div>
                                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setInputs({ apparent: "35", temp: "38", wind: "8", humidity: "60", precipProb: "0", precipIn: "0", uvIndex: "2", cloudCover: "50", pressure: "1018", solarRadiation: "150", isDay: true, debugTimeHour: "" })}
                                                className="text-xs"
                                            >
                                                ❄️ Chilly 35°F
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setInputs({ apparent: "22", temp: "26", wind: "12", humidity: "55", precipProb: "0", precipIn: "0", uvIndex: "1", cloudCover: "60", pressure: "1022", solarRadiation: "100", isDay: true, debugTimeHour: "" })}
                                                className="text-xs"
                                            >
                                                ❄️ Cold 22°F
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setInputs({ apparent: "8", temp: "15", wind: "18", humidity: "50", precipProb: "0", precipIn: "0", uvIndex: "0", cloudCover: "70", pressure: "1025", solarRadiation: "0", isDay: true, debugTimeHour: "" })}
                                                className="text-xs"
                                            >
                                                🥶 Very Cold 8°F
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 sm:text-[10px]">Precipitation</div>
                                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setInputs({ apparent: "33", temp: "35", wind: "8", humidity: "75", precipProb: "70", precipIn: "0.08", uvIndex: "0", cloudCover: "95", pressure: "1005", solarRadiation: "0", isDay: true, debugTimeHour: "" })}
                                                className="text-xs"
                                            >
                                                🧊 Freezing Rain
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setInputs({ apparent: "55", temp: "56", wind: "10", humidity: "85", precipProb: "80", precipIn: "0.15", uvIndex: "1", cloudCover: "100", pressure: "1002", solarRadiation: "50", isDay: true, debugTimeHour: "" })}
                                                className="text-xs"
                                            >
                                                🌧️ Heavy Rain
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Real feel / apparent</label>
                                    <Input type="number" value={inputs.apparent || ""} onChange={handleInputChange('apparent')} placeholder="e.g., 38" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Actual temperature</label>
                                    <Input type="number" value={inputs.temp || ""} onChange={handleInputChange('temp')} placeholder="e.g., 40" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Wind speed (mph)</label>
                                    <Input type="number" value={inputs.wind || ""} onChange={handleInputChange('wind')} placeholder="e.g., 12" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Humidity (%)</label>
                                    <Input type="number" value={inputs.humidity || ""} onChange={handleInputChange('humidity')} placeholder="e.g., 65" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Precip probability (%)</label>
                                    <Input type="number" value={inputs.precipProb || ""} onChange={handleInputChange('precipProb')} placeholder="e.g., 40" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Precip amount (in)</label>
                                    <Input type="number" value={inputs.precipIn || ""} onChange={handleInputChange('precipIn')} placeholder="e.g., 0.05" step="0.01" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">UV index</label>
                                    <Input type="number" value={inputs.uvIndex || ""} onChange={handleInputChange('uvIndex')} placeholder="e.g., 3" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Cloud cover (%)</label>
                                    <Input type="number" value={inputs.cloudCover || ""} onChange={handleInputChange('cloudCover')} placeholder="e.g., 25" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Pressure (hPa)</label>
                                    <Input type="number" value={inputs.pressure || ""} onChange={handleInputChange('pressure')} placeholder="e.g., 1013" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Solar radiation (W/m²)</label>
                                    <Input type="number" value={inputs.solarRadiation || ""} onChange={handleInputChange('solarRadiation')} placeholder="e.g., 650" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Daylight</label>
                                    <div className="flex items-center gap-2.5 rounded-lg border border-amber-200/70 bg-amber-50/50 px-2.5 py-2 dark:border-amber-500/30 dark:bg-amber-500/10 sm:gap-3 sm:px-3">
                                        <Switch id="debug-isDay" checked={inputs.isDay} onCheckedChange={handleSwitchChange('isDay')} />
                                        <Label htmlFor="debug-isDay" className="text-xs text-slate-600 dark:text-slate-200 sm:text-sm">
                                            {inputs.isDay ? "Daytime" : "Nighttime"}
                                        </Label>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-lg border border-purple-200/60 bg-purple-50/50 p-3 dark:border-purple-500/30 dark:bg-purple-500/10">
                                <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-purple-700 dark:text-purple-300 sm:text-xs">Time Override (Test Tomorrow's Outfit Card)</div>
                                <div className="mb-3 flex flex-wrap gap-1.5 sm:gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setInputs(prev => ({ ...prev, debugTimeHour: "8" }))}
                                        className="text-xs"
                                    >
                                        8 AM (Morning)
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setInputs(prev => ({ ...prev, debugTimeHour: "14" }))}
                                        className="text-xs"
                                    >
                                        2 PM (Afternoon)
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setInputs(prev => ({ ...prev, debugTimeHour: "17" }))}
                                        className="text-xs"
                                    >
                                        5 PM (Evening)
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setInputs(prev => ({ ...prev, debugTimeHour: "20" }))}
                                        className="text-xs"
                                    >
                                        8 PM (Evening)
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setInputs(prev => ({ ...prev, debugTimeHour: "" }))}
                                        className="text-xs"
                                    >
                                        ❌ Clear override
                                    </Button>
                                </div>
                                {inputs.debugTimeHour !== undefined && inputs.debugTimeHour !== "" && (
                                    <div className="text-xs text-purple-600 dark:text-purple-400">
                                        Testing as {parseInt(inputs.debugTimeHour) % 12 || 12}{parseInt(inputs.debugTimeHour) >= 12 ? ' PM' : ' AM'} - Card will appear {parseInt(inputs.debugTimeHour) >= 17 && parseInt(inputs.debugTimeHour) < 23 ? 'at TOP (evening)' : 'at BOTTOM (daytime)'}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 rounded-lg border border-amber-300/60 bg-amber-100/40 p-2.5 dark:border-amber-500/40 dark:bg-amber-500/10 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-3">
                                <div className="text-[10px] font-medium text-amber-800 dark:text-amber-200 sm:text-xs">
                                    💡 Enter values above or click a preset, then hit <strong>Apply scenario</strong> to activate.
                                </div>
                                <div className="flex items-center gap-2">
                                    {debugActive && (
                                        <Button variant="ghost" onClick={onClearScenario} className="h-8 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-300 dark:hover:text-amber-200">
                                            Reload live
                                        </Button>
                                    )}
                                    <Button onClick={() => onApplyScenario(inputs)} className="h-8 text-xs sm:h-9 sm:text-sm">
                                        Apply scenario
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
