"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Menu, X } from "lucide-react";

interface NavbarProps {
	userDashboardUrl?: string | null;
}

export function MarketingNavbar({ userDashboardUrl }: NavbarProps) {
	const pathname = usePathname();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const navLinks = [
		{ label: "Home", href: "/" },
		{ label: "Features", href: "/features" },
		{ label: "How it works", href: "/how-it-works" },
		{ label: "Community", href: "/community" },
	];

	return (
		<header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md transition-all">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
				{/* Brand Logo matching Image */}
				<Link
					href="/"
					className="inline-flex items-center gap-2 text-2xl font-black tracking-tight text-deep font-heading group shrink-0"
				>
					<Image
						src="/lpu_logo.png"
						alt="Lovely Professional University"
						width={30}
						height={30}
						className="h-12 w-12 object-contain"
					/>
					<span>alma</span>
					<span className="text-primary-600 font-black text-3xl leading-none">.</span>
				</Link>

				{/* Desktop Navigation Links matching Image */}
				<nav className="hidden md:flex items-center gap-2">
					{navLinks.map((link) => {
						const isActive = pathname === link.href;
						return (
							<Link
								key={link.href}
								href={link.href}
								prefetch={true}
								className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
									isActive
										? "bg-primary-100 text-primary-600 font-semibold"
										: "text-slate-700 hover:text-deep hover:bg-slate-100/60"
								}`}
							>
								{link.label}
							</Link>
						);
					})}
				</nav>

				{/* Right CTA / Auth Button matching Image */}
				<div className="hidden md:flex items-center gap-3 shrink-0">
					{userDashboardUrl ? (
						<Link
							href={userDashboardUrl}
							prefetch={true}
							className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-xs transition-all hover:scale-[1.02]"
						>
							<span>Dashboard</span>
							<ArrowRight className="w-4 h-4" />
						</Link>
					) : (
						<Link
							href="/login"
							prefetch={true}
							className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold border border-primary-200 bg-white/90 hover:bg-primary-50 text-primary-600 shadow-2xs transition-all hover:scale-[1.02]"
						>
							<span>Login / Sign up</span>
							<ArrowRight className="w-4 h-4 text-primary-600" />
						</Link>
					)}
				</div>

				{/* Mobile Hamburger Toggle */}
				<div className="flex md:hidden items-center">
					<button
						type="button"
						onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						className="p-2 rounded-xl text-slate-700 hover:text-deep hover:bg-slate-100 transition-colors"
						aria-label="Toggle navigation menu"
					>
						{mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
					</button>
				</div>
			</div>

			{/* Mobile Drawer Menu */}
			{mobileMenuOpen && (
				<div className="md:hidden border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 py-5 space-y-3 animate-in fade-in duration-200 shadow-md">
					<div className="flex flex-col gap-1.5">
						{navLinks.map((link) => {
							const isActive = pathname === link.href;
							return (
								<Link
									key={link.href}
									href={link.href}
									onClick={() => setMobileMenuOpen(false)}
									className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
										isActive
											? "bg-primary-100 text-primary-600 font-semibold"
											: "text-slate-600 hover:text-deep hover:bg-slate-50"
									}`}
								>
									{link.label}
								</Link>
							);
						})}
					</div>

					<div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
						{userDashboardUrl ? (
							<Link
								href={userDashboardUrl}
								onClick={() => setMobileMenuOpen(false)}
								className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-primary-600 text-white"
							>
								<span>Go to Dashboard</span>
								<ArrowRight className="w-4 h-4" />
							</Link>
						) : (
							<>
								<Link
									href="/login"
									onClick={() => setMobileMenuOpen(false)}
									className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border border-primary-600/40 bg-white text-deep"
								>
									<span>Login / Sign up</span>
									<ArrowRight className="w-4 h-4 text-primary-600" />
								</Link>
								<Link
									href="/register"
									onClick={() => setMobileMenuOpen(false)}
									className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-primary-600 text-white"
								>
									<span>Get started</span>
								</Link>
							</>
						)}
					</div>
				</div>
			)}
		</header>
	);
}
