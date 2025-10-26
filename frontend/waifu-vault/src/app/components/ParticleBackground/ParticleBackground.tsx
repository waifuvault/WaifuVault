"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./ParticleBackground.module.scss";
import { ThemeType } from "@/app/constants/theme";
import { useTheme } from "@/app/contexts";

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
    color: string;
    type: "dot" | "star" | "code" | "upload" | "gear" | "steam";
    angle: number;
    life: number;
    maxLife: number;
    rotationSpeed?: number;
}

interface ParticleBackgroundProps {
    isDragging?: boolean;
    isUploading?: boolean;
    intensity?: "low" | "medium" | "high";
}

function ParticleBackground({
    isDragging = false,
    isUploading = false,
    intensity = "medium",
}: ParticleBackgroundProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const mouseRef = useRef({ x: 0, y: 0 });
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const { currentTheme: theme } = useTheme();

    const { particlesEnabled } = useTheme();

    const getThemeConfig = (currentTheme: ThemeType) => {
        switch (currentTheme) {
            case ThemeType.STEAMPUNK:
                return {
                    colors: ["#cd7f32", "#daa520", "#b8860b", "#d2691e"],
                    particleTypes: ["gear", "steam", "dot"],
                    glowEffect: true,
                    speed: 0.8,
                };
            case ThemeType.CYBERPUNK:
                return {
                    colors: ["#00ffff", "#ff00ff", "#ffff00", "#00ff00"],
                    particleTypes: ["dot", "code"],
                    glowEffect: true,
                    speed: 1.5,
                };
            case ThemeType.GREEN_PHOSPHOR:
            case ThemeType.ORANGE_PHOSPHOR:
                return {
                    colors: currentTheme === ThemeType.GREEN_PHOSPHOR ? ["#00ff00", "#008000"] : ["#ffa500", "#cc8400"],
                    particleTypes: ["code"],
                    glowEffect: true,
                    speed: 1,
                };
            case ThemeType.MINIMAL:
                return {
                    colors: ["#007bff", "#0056b3", "#6c757d"],
                    particleTypes: ["dot"],
                    glowEffect: false,
                    speed: 0.8,
                };
            case ThemeType.DEFAULT:
            default:
                return {
                    colors: ["#667eea", "#764ba2", "#ff9a9e", "#fecfef"],
                    particleTypes: ["dot", "star"],
                    glowEffect: true,
                    speed: 1.2,
                };
        }
    };

    const config = useMemo(() => getThemeConfig(theme), [theme]);

    const getParticleCount = useCallback(() => {
        const base = {
            low: 30,
            medium: 60,
            high: 100,
        }[intensity];

        if (isDragging) {
            return base * 2;
        }
        if (isUploading) {
            return base * 1.5;
        }
        return base;
    }, [intensity, isDragging, isUploading]);

    const createParticle = useCallback(
        (x?: number, y?: number): Particle => {
            const canvas = canvasRef.current;
            if (!canvas) {
                return {} as Particle;
            }

            const colors = config.colors;
            const types = config.particleTypes as Array<"dot" | "star" | "code" | "upload" | "gear" | "steam">;

            const particle: Particle = {
                x: x ?? Math.random() * canvas.width,
                y: y ?? Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * config.speed,
                vy: (Math.random() - 0.5) * config.speed,
                size: Math.random() * 3 + 1,
                opacity: Math.random() * 0.8 + 0.2,
                color: colors[Math.floor(Math.random() * colors.length)],
                type: types[Math.floor(Math.random() * types.length)],
                angle: Math.random() * Math.PI * 2,
                life: 0,
                maxLife: Math.random() * 1000 + 500,
            };

            if (particle.type === "gear") {
                particle.rotationSpeed = (Math.random() - 0.5) * 0.02;
                particle.size = Math.random() * 4 + 2;
            }

            if (particle.type === "steam") {
                particle.vy = -(Math.random() * 0.5 + 0.2);
                particle.vx = (Math.random() - 0.5) * 0.3;
                particle.size = Math.random() * 6 + 3;
                particle.opacity = Math.random() * 0.4 + 0.1;
            }

            if (particle.type === "code") {
                particle.angle = 0;
                particle.size = 8;
                particle.vx = 0;
                particle.vy = config.speed;
                particle.maxLife *= 3;
            }

            return particle;
        },
        [config.colors, config.particleTypes, config.speed],
    );

    const drawParticle = useCallback(
        (ctx: CanvasRenderingContext2D, particle: Particle) => {
            ctx.save();
            ctx.globalAlpha = particle.opacity;
            ctx.fillStyle = particle.color;

            if (config.glowEffect) {
                ctx.shadowColor = particle.color;
                ctx.shadowBlur = particle.size * 2;
            }

            ctx.translate(particle.x, particle.y);

            switch (particle.type) {
                case "gear": {
                    const gearRadius = particle.size;
                    const teeth = 8;
                    const innerRadius = gearRadius * 0.6;
                    const toothHeight = gearRadius * 0.3;

                    ctx.rotate(particle.angle);

                    ctx.beginPath();
                    for (let i = 0; i < teeth; i++) {
                        const angle = (i * Math.PI * 2) / teeth;
                        const nextAngle = ((i + 1) * Math.PI * 2) / teeth;

                        const x1 = Math.cos(angle) * gearRadius;
                        const y1 = Math.sin(angle) * gearRadius;
                        const x2 = Math.cos(angle) * (gearRadius + toothHeight);
                        const y2 = Math.sin(angle) * (gearRadius + toothHeight);
                        const x3 = Math.cos(nextAngle) * (gearRadius + toothHeight);
                        const y3 = Math.sin(nextAngle) * (gearRadius + toothHeight);
                        const x4 = Math.cos(nextAngle) * gearRadius;
                        const y4 = Math.sin(nextAngle) * gearRadius;

                        if (i === 0) {
                            ctx.moveTo(x1, y1);
                        }
                        ctx.lineTo(x2, y2);
                        ctx.lineTo(x3, y3);
                        ctx.lineTo(x4, y4);
                    }
                    ctx.closePath();
                    ctx.fill();

                    ctx.beginPath();
                    ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.globalCompositeOperation = "destination-out";
                    ctx.beginPath();
                    ctx.arc(0, 0, innerRadius * 0.3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalCompositeOperation = "source-over";
                    break;
                }

                case "steam": {
                    const cloudSize = particle.size;
                    const numClouds = 3;

                    for (let i = 0; i < numClouds; i++) {
                        const offsetX = (Math.random() - 0.5) * cloudSize * 0.5;
                        const offsetY = (Math.random() - 0.5) * cloudSize * 0.5;
                        const radius = cloudSize * (0.3 + Math.random() * 0.4);

                        ctx.beginPath();
                        ctx.arc(offsetX, offsetY, radius, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    break;
                }

                case "star":
                    ctx.rotate(particle.angle);
                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) {
                        const angle = (i * Math.PI * 2) / 5;
                        const radius = i % 2 === 0 ? particle.size : particle.size / 2;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        if (i === 0) {
                            ctx.moveTo(x, y);
                        } else {
                            ctx.lineTo(x, y);
                        }
                    }
                    ctx.closePath();
                    ctx.fill();
                    break;

                case "code": {
                    ctx.font = `${particle.size * 3}px monospace`;
                    ctx.textAlign = "center";
                    const codeChars = [
                        "<",
                        ">",
                        "{",
                        "}",
                        "/",
                        "\\",
                        "|",
                        "-",
                        "+",
                        "0",
                        "1",
                        "2",
                        "3",
                        "4",
                        "5",
                        "6",
                        "7",
                        "8",
                        "9",
                        "A",
                        "B",
                        "C",
                        "D",
                        "E",
                        "F",
                        "G",
                        "H",
                        "I",
                        "J",
                        "K",
                        "L",
                        "M",
                        "N",
                        "O",
                        "P",
                        "Q",
                        "R",
                        "S",
                        "T",
                        "U",
                        "V",
                        "W",
                        "X",
                        "Y",
                        "Z",
                    ];
                    const char = codeChars[Math.floor(particle.life / 100) % codeChars.length];
                    ctx.fillText(char, 0, particle.size);
                    break;
                }

                case "upload":
                    ctx.beginPath();
                    ctx.moveTo(0, -particle.size);
                    ctx.lineTo(-particle.size / 2, 0);
                    ctx.lineTo(particle.size / 2, 0);
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillRect(-particle.size / 4, 0, particle.size / 2, particle.size);
                    break;

                default:
                    ctx.beginPath();
                    ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }

            ctx.restore();
        },
        [config.glowEffect],
    );

    const updateParticle = useCallback(
        (particle: Particle, deltaTime: number) => {
            const canvas = canvasRef.current;
            if (!canvas) {
                return;
            }

            particle.life += deltaTime;
            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.type === "gear" && particle.rotationSpeed) {
                particle.angle += particle.rotationSpeed;
            } else {
                particle.angle += 0.02;
            }

            if (particle.type === "steam") {
                particle.opacity = Math.max(0, particle.opacity - 0.002);
                particle.size += 0.01;
            }

            if (isDragging) {
                const dx = mouseRef.current.x - particle.x;
                const dy = mouseRef.current.y - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 200) {
                    const force = ((200 - distance) / 200) * 0.01;
                    particle.vx += dx * force;
                    particle.vy += dy * force;
                }
            }

            if (isUploading) {
                particle.vy -= 0.02;
                particle.opacity = Math.max(0, particle.opacity - 0.005);
            }

            if (particle.x < 0) {
                particle.x = canvas.width;
            }
            if (particle.x > canvas.width) {
                particle.x = 0;
            }
            if (particle.y < 0) {
                particle.y = canvas.height;
            }
            if (particle.y > canvas.height) {
                particle.y = 0;
            }

            if (particle.life > particle.maxLife || particle.opacity <= 0) {
                Object.assign(particle, createParticle());
            }
        },
        [isDragging, isUploading, createParticle],
    );

    const animateRef = useRef<(() => void) | undefined>(undefined);

    useEffect(() => {
        animateRef.current = () => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!canvas || !ctx) {
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const targetCount = getParticleCount();

            while (particlesRef.current.length < targetCount) {
                particlesRef.current.push(createParticle());
            }

            while (particlesRef.current.length > targetCount) {
                particlesRef.current.pop();
            }

            if (theme === ThemeType.CYBERPUNK) {
                ctx.strokeStyle = config.colors[0];
                ctx.globalAlpha = 0.1;
                ctx.lineWidth = 1;

                for (let i = 0; i < particlesRef.current.length; i++) {
                    for (let j = i + 1; j < particlesRef.current.length; j++) {
                        const p1 = particlesRef.current[i];
                        const p2 = particlesRef.current[j];
                        const dx = p1.x - p2.x;
                        const dy = p1.y - p2.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < 100) {
                            ctx.globalAlpha = ((100 - distance) / 100) * 0.2;
                            ctx.beginPath();
                            ctx.moveTo(p1.x, p1.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.stroke();
                        }
                    }
                }
            }

            if (theme === ThemeType.STEAMPUNK) {
                ctx.strokeStyle = config.colors[0];
                ctx.globalAlpha = 0.05;
                ctx.lineWidth = 2;

                const gears = particlesRef.current.filter(p => p.type === "gear");
                for (let i = 0; i < gears.length; i++) {
                    for (let j = i + 1; j < gears.length; j++) {
                        const p1 = gears[i];
                        const p2 = gears[j];
                        const dx = p1.x - p2.x;
                        const dy = p1.y - p2.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < 150) {
                            ctx.globalAlpha = ((150 - distance) / 150) * 0.1;
                            ctx.beginPath();
                            ctx.moveTo(p1.x, p1.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.stroke();
                        }
                    }
                }
            }

            particlesRef.current.forEach(particle => {
                updateParticle(particle, 16);
                drawParticle(ctx, particle);
            });

            animationRef.current = requestAnimationFrame(() => animateRef.current?.());
        };
    }, [getParticleCount, createParticle, theme, config.colors, updateParticle, drawParticle]);

    const animate = useCallback(() => {
        animateRef.current?.();
    }, []);

    const handleMouseMove = (e: MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const rect = canvas.getBoundingClientRect();
        mouseRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const handleResize = () => {
        setDimensions({
            width: window.innerWidth,
            height: window.innerHeight,
        });
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDimensions({
            width: window.innerWidth,
            height: window.innerHeight,
        });

        window.addEventListener("resize", handleResize);
        document.addEventListener("mousemove", handleMouseMove);

        return () => {
            window.removeEventListener("resize", handleResize);
            document.removeEventListener("mousemove", handleMouseMove);
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !particlesEnabled) {
            return;
        }

        canvas.width = dimensions.width;
        canvas.height = dimensions.height;

        particlesRef.current = Array.from({ length: getParticleCount() }, () => createParticle());

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [
        dimensions,
        theme,
        isDragging,
        isUploading,
        intensity,
        particlesEnabled,
        getParticleCount,
        createParticle,
        animate,
    ]);

    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    if (!particlesEnabled) {
        return null;
    }

    return (
        <canvas
            ref={canvasRef}
            className={styles.particleCanvas}
            style={{
                width: dimensions.width,
                height: dimensions.height,
            }}
        />
    );
}

export default memo(ParticleBackground);
