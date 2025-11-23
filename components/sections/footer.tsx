import Link from "next/link";
import { Facebook, Instagram, Youtube, MessageCircle } from "lucide-react";
import Image from "next/image";

export function Footer() {
    return (
        <footer className="w-full bg-neutral-100 py-12">
            <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-12 px-6 md:px-12 lg:px-12 xl:px-24">
                {/* Top Section */}
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center">
                        <div className="flex flex-col">
                            <span className="font-koulen text-2xl font-normal uppercase leading-none text-black">
                                SOULPRINT
                            </span>
                            <span className="font-koulen text-xs font-normal uppercase leading-none tracking-[0.2em] text-black">
                                ENGINE
                            </span>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <nav className="hidden items-center gap-8 md:flex">
                        <Link
                            href="#"
                            className="font-inter text-sm font-normal text-black transition-colors hover:text-neutral-600"
                        >
                            Home
                        </Link>
                        <Link
                            href="#"
                            className="font-inter text-sm font-normal text-black transition-colors hover:text-neutral-600"
                        >
                            About Us
                        </Link>
                        <Link
                            href="#"
                            className="font-inter text-sm font-normal text-black transition-colors hover:text-neutral-600"
                        >
                            Pricing
                        </Link>
                        <Link
                            href="#"
                            className="font-inter text-sm font-normal text-black transition-colors hover:text-neutral-600"
                        >
                            Contact Us
                        </Link>
                        <Link
                            href="#"
                            className="font-inter text-sm font-normal text-black transition-colors hover:text-neutral-600"
                        >
                            FAQ
                        </Link>
                    </nav>

                    {/* Social Icons */}
                    <div className="flex items-center gap-4">
                        <Link
                            href="#"
                            className="text-black transition-colors hover:text-neutral-600"
                        >
                            <Facebook className="h-5 w-5" />
                        </Link>
                        <Link
                            href="#"
                            className="text-black transition-colors hover:text-neutral-600"
                        >
                            <Instagram className="h-5 w-5" />
                        </Link>
                        <Link
                            href="#"
                            className="text-black transition-colors hover:text-neutral-600"
                        >
                            <svg
                                className="h-5 w-5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                        </Link>
                        <Link
                            href="#"
                            className="text-black transition-colors hover:text-neutral-600"
                        >
                            <Youtube className="h-5 w-5" />
                        </Link>
                        <Link
                            href="#"
                            className="text-black transition-colors hover:text-neutral-600"
                        >
                            <MessageCircle className="h-5 w-5" />
                        </Link>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="flex items-center justify-between border-t border-neutral-300 pt-6">
                    <p className="font-inter text-sm font-normal text-neutral-600">
                        Copyright 2025 © soulprintengine.ai
                    </p>

                    <div className="flex items-center gap-6">
                        <Link
                            href="#"
                            className="font-inter text-sm font-normal text-neutral-600 transition-colors hover:text-black"
                        >
                            Privacy Policy
                        </Link>
                        <Link
                            href="#"
                            className="font-inter text-sm font-normal text-neutral-600 transition-colors hover:text-black"
                        >
                            Terms of Service
                        </Link>
                        <Link
                            href="#"
                            className="font-inter text-sm font-normal text-neutral-600 transition-colors hover:text-black"
                        >
                            Cookies Settings
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
