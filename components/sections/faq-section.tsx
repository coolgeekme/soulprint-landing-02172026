"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

export function FaqSection() {
    return (
        <section className="w-full py-20 bg-background">
            <div className="container px-4 max-w-3xl">
                <h2 className="text-4xl font-bold mb-12 text-center font-koulen">FAQ</h2>
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>What is SoulPrint?</AccordionTrigger>
                        <AccordionContent>
                            SoulPrint is your portable digital identity and memory, allowing you to carry your context across different AI models.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                        <AccordionTrigger>Where is my data stored?</AccordionTrigger>
                        <AccordionContent>
                            Your data is stored locally on your device or in your private cloud, ensuring complete privacy and ownership.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </section>
    )
}
