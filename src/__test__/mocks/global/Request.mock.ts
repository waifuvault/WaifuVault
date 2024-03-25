import type { Request } from "express";

export const requestMockStandardIpv4 = {
    ip: "192.168.2.2",
    headers: { "cf-connecting-ip": "192.168.2.3" },
    url: "https://waifuvault.moe",
} as unknown as Request;

export const requestMockIpv6WithPort = {
    ip: "[2001:470:30:84:e276:63ff:fe62]:3035",
    url: "https://waifuvault.moe",
} as unknown as Request;

export const requestMockIpv4WithPort = {
    ip: "192.168.2.2:3035",
    url: "https://waifuvault.moe",
} as unknown as Request;
