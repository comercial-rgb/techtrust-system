"use client";

import React from "react";
import { Shield, Info, CheckCircle, FileText, DollarSign } from "lucide-react";

/**
 * MarketplaceFacilitatorBanner
 * ----------------------------
 * Informative banner para fornecedores explicando que a TechTrust
 * atua como Marketplace Facilitator e coleta/repassa sales tax em nome deles.
 *
 * Base legal:
 * - FL Statute §212.05965 (Marketplace Facilitator law, effective July 1, 2021)
 * - FL Statute §212.0596 (Mail order / remote sales)
 * - FL DOR TIP #21A01-03
 */
export default function MarketplaceFacilitatorBanner({
  compact = false,
}: {
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-900">
            Sales tax collected by TechTrust
          </p>
          <p className="text-blue-700 mt-1">
            Under Florida Statute §212.05965, TechTrust acts as the Marketplace
            Facilitator and collects &amp; remits Florida sales tax on your behalf.
            You do <strong>not</strong> need to collect or remit sales tax on
            transactions processed through the platform.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <div className="bg-blue-600 rounded-xl p-3 flex-shrink-0">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            TechTrust is your Marketplace Facilitator
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            We handle Florida sales tax collection and remittance on your behalf —
            so you can focus on the work.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  We collect
                </p>
                <p className="text-xs text-gray-600">
                  6% FL state + county surtax, calculated automatically per
                  customer location.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900">We remit</p>
                <p className="text-xs text-gray-600">
                  Monthly/quarterly DR-15 filings directly to the FL Department
                  of Revenue.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  You get paid
                </p>
                <p className="text-xs text-gray-600">
                  Your payout is the net of parts + labor, with tax already
                  separated and handled.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-blue-100">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-gray-600">
                <p className="font-semibold text-gray-800 mb-1">Legal basis</p>
                <p>
                  <strong>Florida Statute §212.05965</strong> — Marketplace
                  Facilitator law (effective July 1, 2021). Under this statute,
                  marketplace facilitators are required to collect and remit
                  sales tax on behalf of marketplace sellers for all taxable
                  transactions processed through the platform.
                </p>
                <p className="mt-2">
                  <strong>Important:</strong> You should <strong>not</strong>{" "}
                  include marketplace sales on your personal DR-15 filing
                  (Line A — Gross Sales should exclude TechTrust transactions).
                  Keep records of TechTrust payouts for income tax purposes only.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <Info className="w-3.5 h-3.5" />
            <span>
              Questions? Contact{" "}
              <a
                href="mailto:tax@techtrust.app"
                className="text-blue-600 hover:underline"
              >
                tax@techtrust.app
              </a>{" "}
              or see{" "}
              <a
                href="https://floridarevenue.com/taxes/taxesfees/Pages/sales_tax.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                FL DOR Sales Tax
              </a>
              .
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
