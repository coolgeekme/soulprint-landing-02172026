"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ArrowRightIcon } from "@radix-ui/react-icons";

export interface BreakpointDesktopProps {}

export default function BreakpointDesktop({}: BreakpointDesktopProps) {
  return (
    <section className="w-full bg-background py-16 lg:py-24">
      <div className="container px-6">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          <div className="flex flex-1 flex-col items-start gap-6 text-left lg:gap-8">
            <div className="flex flex-col gap-6">
              <p className="text-sm font-medium text-muted-foreground">
                Hero section
              </p>
              {/* 
                The font 'Koulen' is used in the Figma design. 
                Ensure it is configured in your tailwind.config.js file.
                Example: fontFamily: { koulen: ['Koulen', 'sans-serif'] }
              */}
              <h1 className="font-koulen text-[72px] font-normal leading-[80px] text-foreground lg:text-[112px] lg:leading-[110px]">
                Stop using Ai
                <br />
                in default mode
              </h1>
              <p className="max-w-md text-lg text-muted-foreground">
                Default mode is dead.
              </p>
            </div>
            <div className="flex w-full flex-col items-start gap-3 lg:w-auto lg:flex-row">
              <Button asChild className="w-full lg:w-auto" size="default">
                <Link href="#">Break the Mold</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="hidden lg:inline-flex"
                size="default"
              >
                <Link href="#">
                  Explore
                  <ArrowRightIcon className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="w-full shrink-0 lg:w-[475px]">
            <AspectRatio ratio={1 / 1}>
              <Image
                src="https://ui.shadcn.com/placeholder.svg"
                alt="Abstract placeholder image"
                fill
                className="rounded-xl object-cover"
              />
            </AspectRatio>
          </div>
        </div>
      </div>
    </section>
  );
}
