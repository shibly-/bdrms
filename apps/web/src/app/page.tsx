import Link from "next/link";
import { Flame } from "lucide-react";
import { BookOpen, Building2, ReceiptText, UserCog, Fuel, Milk, ArrowBigRight } from "lucide-react";

export default function Home() {
  return (
    <main className="rms-main-container rounded-2xl border border-zinc-200 mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-4 px-4 py-8 dark:text-zinc-50">

      <section className="flex flex-wrap items-center justify-center gap-3">
        <div className="flex items-center gap-2">
          <Flame className="h-6 w-6" aria-hidden/>
          <h2 className="text-2xl font-semibold text-zinc-900">PRRMS - Gas Billing System</h2>
        </div>     
      </section>

       <section className="flex flex-wrap items-center justify-center gap-3">
        <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
          A platform for admin, staff, and resident self-service.
        </p>
      </section>

      <section className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/login"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          User Login
        </Link>        
      </section>

      <section className="flex flex-wrap items-center justify-center gap-3">
        <div className="flex items-center gap-2">            
          <h2 className="font-semibold text-zinc-900">Your LPG </h2><Milk className="h-5 w-5 text-zinc-700" /> <ArrowBigRight className="h-5 w-5 text-zinc-700" /> <Flame className="h-5 w-5 text-zinc-700" /><h2 className="font-semibold text-zinc-900"> Gas Billing</h2><ReceiptText className="h-5 w-5 text-zinc-700" />
        </div>
      </section>
      
      <section className="flex flex-wrap items-center justify-center gap-3">
        <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
          Protik Ruposree, House # 78, Road # 12/4, 
          <br />Block # J, South Banasree, Dhaka-1219
        </p>        
      </section>

      <section className="flex flex-wrap items-center justify-center gap-3">
        <Link
            href="https://www.linkedin.com/in/shibly/"
            className="text-sm font-medium text-blue-600 hover:text-blue-900 dark:text-blue-300 dark:hover:text-white"
          >
            Developed By: A S M Abdur Rab
          </Link>
      </section>

    </main>
  );
}
