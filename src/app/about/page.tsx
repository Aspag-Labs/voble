'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { InteractiveDemo } from '@/components/interactive-demo'

const sections = [
  {
    id: 'intro',
    title: 'Introduction',
    content: {
      heading: 'Intro',
      body: (
        <div className="space-y-4">
          <p className="text-sm text-[#707070] font-large tracking-wider">Learn about Voble.</p>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-2">Overview</h2>

            <p>
              Voble is a real stakes, competitive word puzzle game where your vocabulary skills translate directly into
              cryptocurrency rewards. Built on Solana blockchain, it combines the familiar mechanics of word guessing
              games with competitive tournaments and real monetary rewards.
            </p>
            <p>
              Players pay a small entry fee of <strong>1 USDC</strong> to participate in daily word challenges, with the
              top performers earning USDC prizes. The game uses{' '}
              <span className="text-blue-500 font-semibold">
                <a
                  href="https://docs.magicblock.gg/pages/private-ephemeral-rollups-pers/how-to-guide/quickstart"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  private ephemeral rollups by MagicBlock
                </a>
              </span>{' '}
              with blockhash randomness inside a trusted execution environment (TEE) for random and fair word selection—making it
              impossible for anyone to peek or cheat.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-2">How to Play</h2>

            <p>
              Each day, players attempt to guess a randomly selected 6-letter word within 7 attempts. The game provides
              feedback after each guess:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Green tiles indicate correct letters in the correct position</li>
              <li>Purple tiles show correct letters in the wrong position</li>
              <li>Gray tiles represent letters not in the target word</li>
            </ul>
            <p>
              Your performance is scored based on the number of guesses used, completion time, and accuracy. The scoring
              algorithm rewards both speed and efficiency.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-2">Demo</h2>
            <InteractiveDemo />
          </div>
        </div>
      ),
    },
  },
  {
    id: 'tournaments',
    title: 'Tournaments',
    content: {
      heading: 'Tournaments',
      body: (
        <div className="space-y-6">
          <p className="text-sm text-[#707070] font-large tracking-wider">Learn about tournaments.</p>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-2">One Game, Three Opportunities</h2>
            <p>
              You don&apos;t need to play separate games for each tournament.
              <strong>
                {' '}
                Every single game you play automatically counts towards the Daily, Weekly, and Monthly leaderboards
                simultaneously.
              </strong>{' '}
              This means you can potentially win prizes in all three tournaments at the same time!
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Tournament Schedule</h2>

            <div className="pl-3 border-l-2 border-muted">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <span>📅</span> Daily Tournament
              </h3>
              <p className="mt-1">
                Resets every 24 hours at <strong>00:00 UTC+8</strong>. Each day is a fresh start with a new word and a
                clean leaderboard. Perfect for quick wins.
              </p>
            </div>

            <div className="pl-3 border-l-2 border-muted">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <span>🗓️</span> Weekly Tournament
              </h3>
              <p className="mt-1">
                Runs from <strong>Sunday to Sunday</strong> (UTC+8). Your total score across the 7 days determines your
                rank. This rewards consistency and regular play.
              </p>
            </div>

            <div className="pl-3 border-l-2 border-muted">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <span>🏆</span> Monthly Tournament
              </h3>
              <p className="mt-1">
                Runs for the full <strong>calendar month</strong>. This is the ultimate challenge, proving your
                long-term mastery to win the biggest prizes.
              </p>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Prize Distribution</h2>
            <p className="mb-4">
              Each tournament tier has a different number of winners who share the prize pool.
            </p>

            <div className="space-y-6">
              <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                <h3 className="font-bold text-primary mb-2">📅 Daily - Top 10 Winners</h3>
                <p className="text-sm text-muted-foreground">1st: 35% • 2nd: 20% • 3rd: 12% • 4th: 8% • 5th: 6% • 6th: 5% • 7th-8th: 4% each • 9th-10th: 3% each</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                <h3 className="font-bold text-primary mb-2">🗓️ Weekly - Top 5 Winners</h3>
                <p className="text-sm text-muted-foreground">1st: 40% • 2nd: 25% • 3rd: 15% • 4th: 12% • 5th: 8%</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                <h3 className="font-bold text-primary mb-2">🏆 Monthly - Top 3 Winners</h3>
                <p className="text-sm text-muted-foreground">1st: 50% • 2nd: 30% • 3rd: 20%</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              Prizes are claimable via the dashboard immediately after the period ends.
            </p>
          </div>
        </div>
      ),
    },
  },
  {
    id: 'scoring',
    title: 'Scoring',
    content: {
      heading: 'Scoring',
      body: (
        <div className="space-y-4">
          <p className="text-sm text-[#707070] font-large tracking-wider">Learn about scoring in Voble.</p>

          <p>
            Your score in Voble is a combination of accuracy and speed. You earn points only when you solve the word.
            The total score for a game is calculated as:
          </p>
          <div className="bg-muted/50 p-4 rounded-lg my-4 text-center font-mono text-lg">
            Total Score = Base Score + Time Bonus
          </div>

          <h3 className="text-xl font-semibold mt-6 mb-2">1. Base Score</h3>
          <p>
            Points are awarded based on how many guesses you needed to solve the word. Fewer guesses mean more points.
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>
              1 Guess: <span className="font-bold">1,000 pts</span>
            </li>
            <li>
              2 Guesses: <span className="font-bold">800 pts</span>
            </li>
            <li>
              3 Guesses: <span className="font-bold">600 pts</span>
            </li>
            <li>
              4 Guesses: <span className="font-bold">400 pts</span>
            </li>
            <li>
              5 Guesses: <span className="font-bold">300 pts</span>
            </li>
            <li>
              6 Guesses: <span className="font-bold">200 pts</span>
            </li>
            <li>
              7 Guesses: <span className="font-bold">100 pts</span>
            </li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-2">2. Time Bonus</h3>
          <p>Speed matters! You get bonus points for finishing quickly.</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>
              Max 3 minutes: <span className="font-bold">+100 pts</span>
            </li>
            <li>
              Max 5 minutes: <span className="font-bold">+50 pts</span>
            </li>
            <li>
              Max 7 minutes: <span className="font-bold">+20 pts</span>
            </li>
            <li>
              Over 7 minutes: <span className="font-bold">+0 pts</span>
            </li>
          </ul>

          <div className="bg-muted/30 p-4 rounded-lg mt-4 border border-border/50">
            <p className="font-semibold mb-1">Example Calculation:</p>
            <p className="text-sm text-muted-foreground">
              You solve the word in <span className="font-bold text-foreground">3 guesses</span> and take{' '}
              <span className="font-bold text-foreground">150 seconds</span>.
              <br />
              Base Score (3 guesses) = 600
              <br />
              Time Bonus (max 3 min) = 100
              <br />
              <span className="font-bold text-foreground">Total Score = 700 points</span>
            </p>
          </div>

          <h2 className="text-2xl font-bold mt-8 mb-4">Tournament Scoring</h2>
          <p className="mb-4">
            Your game scores accumulate differently for each tournament period. Here is how it works:
          </p>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-primary">Daily Tournament</h3>
              <p>Your score for the daily tournament is simply your score from that day&apos;s single game.</p>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-semibold">Example:</span> If you score 900 points today, your entry for the Daily
                Leaderboard is 900.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-primary">Weekly Tournament</h3>
              <p>
                Your weekly score is the <strong>sum of all your daily scores</strong> from Sunday to Sunday (UTC+8).
                Consistency is key!
              </p>
              <div className="text-sm text-muted-foreground mt-1 bg-muted/30 p-3 rounded">
                <p className="font-semibold mb-1">Example Week:</p>
                <ul className="list-none space-y-1 font-mono text-xs">
                  <li>Mon: 900 pts</li>
                  <li>Tue: 700 pts</li>
                  <li>Wed: 0 pts (Missed/Failed)</li>
                  <li>Thu: 850 pts</li>
                  <li>Fri: 600 pts</li>
                  <li>Sat: 950 pts</li>
                  <li>Sun: 800 pts</li>
                  <li className="border-t pt-1 font-bold text-primary">Total Weekly Score: 4,800 pts</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-primary">Monthly Tournament</h3>
              <p>
                Your monthly score is the <strong>sum of all your daily scores</strong> for the entire calendar month.
                Playing every day maximizes your chances.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-semibold">Example:</span> If you average 800 points per day over a 30-day month,
                your Monthly Tournament score would be <span className="font-mono">24,000 pts</span>.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 border border-border/50 rounded-lg bg-muted/30">
            <h4 className="font-bold flex items-center gap-2">
              <span>🏆</span> Tie-Breaker Rules
            </h4>
            <ul className="list-disc pl-5 mt-2 text-sm space-y-1 text-muted-foreground">
              <li>
                <strong className="text-foreground">Primary:</strong> Higher score wins.
              </li>
              <li>
                <strong className="text-foreground">Secondary:</strong> If scores are equal, the player with the{' '}
                <strong className="text-foreground">fastest completion time</strong> wins.
              </li>
              <li>
                <strong className="text-foreground">Final:</strong> If both score and time are identical, the player who{' '}
                <strong className="text-foreground">submitted their score first</strong> wins.
              </li>
            </ul>
          </div>
        </div>
      ),
    },
  },
  {
    id: 'lucky-draw',
    title: 'Lucky Draw',
    content: {
      heading: 'Lucky Draw',
      body: (
        <div className="space-y-6">
          <p className="text-sm text-[#707070] font-large tracking-wider">Learn about the weekly raffle.</p>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Automatic Entry</h2>
            <p>
              Every player who participates during the week is automatically entered into the Lucky Draw.
              <strong> All players are eligible, including tournament winners!</strong>
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">How It Works</h2>

            <div className="pl-3 border-l-2 border-muted">
              <h3 className="text-lg font-bold text-primary">Prize Pool Allocation</h3>
              <p className="mt-1">
                <strong>5% of all ticket sales</strong> accumulate into the weekly Lucky Draw jackpot. As more people play, the prize grows.
              </p>
            </div>

            <div className="pl-3 border-l-2 border-muted">
              <h3 className="text-lg font-bold text-primary">Winner Selection</h3>
              <p className="mt-1">
                Every Monday at 00:15 UTC+8, one lucky winner from the previous week is randomly selected using{' '}
                <span className="text-blue-500 font-semibold">
                  <a
                    href="https://www.magicblock.xyz/blog/true-onchain-randomness"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    MagicBlock's Verifiable Random Function (VRF)
                  </a>
                </span>
                —ensuring a provably fair and tamper-proof selection process.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-bold mb-4">Eligibility</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Play at least <strong>1 game</strong> during the week.
              </li>
              <li>
                <strong>All players</strong> who participated are eligible, including daily and weekly prize winners!
              </li>
            </ul>
          </div>
        </div>
      ),
    },
  },
  {
    id: 'fee-structure',
    title: 'Fee Structure',
    content: {
      heading: 'Fee Structure',
      body: (
        <div className="space-y-6">
          <p className="text-sm text-[#707070] font-large tracking-wider">Learn how funds are distributed.</p>

          <p>
            Voble is built on a foundation of fairness. Every USDC entered goes into a verifiable on-chain distribution
            system, ensuring that the majority of funds return directly to the players.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="bg-muted/30 p-4 rounded-lg border border-border/50 text-center">
              <div className="text-2xl mb-2">🏆</div>
              <div className="text-2xl font-bold text-primary mb-1">80%</div>
              <div className="font-semibold text-sm">Player Rewards</div>
              <p className="text-xs text-muted-foreground mt-2">
                Funds the Daily, Weekly, and Monthly tournament prize pools.
              </p>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border border-border/50 text-center">
              <div className="text-2xl mb-2">🎲</div>
              <div className="text-2xl font-bold text-primary mb-1">5%</div>
              <div className="font-semibold text-sm">Lucky Draw</div>
              <p className="text-xs text-muted-foreground mt-2">
                Weekly jackpot where one random player wins.
              </p>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border border-border/50 text-center">
              <div className="text-2xl mb-2">⚙️</div>
              <div className="text-2xl font-bold text-primary mb-1">15%</div>
              <div className="font-semibold text-sm">Operations</div>
              <p className="text-xs text-muted-foreground mt-2">
                Platform development and maintenance.
              </p>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Prize Pool Allocation</h2>
            <p className="mb-4">
              Here is the breakdown of how each ticket is allocated to the tournament prize pools:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              <div className="bg-muted/30 p-3 rounded-lg border border-border/50 text-center">
                <div className="text-xl font-bold text-primary mb-1">52%</div>
                <div className="text-xs font-semibold">Daily Vault</div>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg border border-border/50 text-center">
                <div className="text-xl font-bold text-primary mb-1">16%</div>
                <div className="text-xs font-semibold">Weekly Vault</div>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg border border-border/50 text-center">
                <div className="text-xl font-bold text-primary mb-1">12%</div>
                <div className="text-xs font-semibold">Monthly Vault</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              All fund distributions are executed automatically by smart contracts on the Solana blockchain and
              verifiable.
            </p>
          </div>
        </div>
      ),
    },
  },
  {
    id: 'referral',
    title: 'Referral',
    content: {
      heading: 'Referral Program',
      body: (
        <div className="space-y-6">
          <p className="text-sm text-[#707070] font-large tracking-wider">Share the game, share the revenue.</p>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Invite Your Friends, Get Lifetime Bonus!</h2>
            <p>Earn more USDC by inviting friends to play Voble.</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-lg border border-border/50 max-w-md">
            <div className="text-2xl mb-2">💸</div>
            <div className="font-bold text-primary mb-1">20% Commission</div>
            <p className="text-sm text-muted-foreground">
              You earn <strong>20% of the platform fees</strong> generated by every player you invite. Paid in USDC.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Potential Earnings</h2>
            <p className="text-sm text-muted-foreground">
              Below is an estimated bonus you'll get based on active daily players you invite on Voble:
            </p>

            <div className="overflow-x-auto rounded-lg border border-border/50">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium">
                  <tr>
                    <th className="px-4 py-3">Active Players</th>
                    <th className="px-4 py-3">Daily Earnings</th>
                    <th className="px-4 py-3">Weekly Earnings</th>
                    <th className="px-4 py-3">Monthly Earnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 bg-muted/10">
                  <tr>
                    <td className="px-4 py-3 font-medium">100</td>
                    <td className="px-4 py-3">3 USDC</td>
                    <td className="px-4 py-3">21 USDC</td>
                    <td className="px-4 py-3">90 USDC</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">1,000</td>
                    <td className="px-4 py-3">30 USDC</td>
                    <td className="px-4 py-3">210 USDC</td>
                    <td className="px-4 py-3">900 USDC</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">2,000</td>
                    <td className="px-4 py-3">60 USDC</td>
                    <td className="px-4 py-3">420 USDC</td>
                    <td className="px-4 py-3">1,800 USDC</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">3,000</td>
                    <td className="px-4 py-3">90 USDC</td>
                    <td className="px-4 py-3">630 USDC</td>
                    <td className="px-4 py-3">2,700 USDC</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">5,000</td>
                    <td className="px-4 py-3">150 USDC</td>
                    <td className="px-4 py-3">1,050 USDC</td>
                    <td className="px-4 py-3">4,500 USDC</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ),
    },
  },
  {
    id: 'tokenomics',
    title: 'Tokenomics',
    content: {
      heading: 'Tokenomics',
      body: (
        <div className="space-y-6">
          <p className="text-sm text-[#707070] font-large tracking-wider">Learn about the token economy.</p>

          {/* Contract Address*/}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Contract Address</h2>
            <p className="font-mono text-sm text-primary bg-muted/30 p-2 rounded-lg border border-border/50 mt-4">
              TBD
            </p>
          </div>

          {/* Devs Address*/}
          <div className="space-y-4">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">Dev Address</h2>
            <p className="text-sm">Receives trading fees for development and token buybacks.</p>
            <p className="font-mono text-sm text-primary bg-muted/30 p-2 rounded-lg border border-border/50 mt-4">
              TBD
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Play-to-Earn</h2>
            <p className="text-md">
              Simply playing Voble earns you <strong>Activity Points</strong>. These points can be exchanged for 500
              $VOBLE tokens, allowing every player to become a stakeholder in the ecosystem just by
              participating.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">Flywheel</h2>
            </div>

            <p className="text-md">
              The Voble ecosystem is designed to create a sustainable value loop where platform success directly
              benefits token holders and players.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Trading Revenue Share */}
              <div className="space-y-4 p-5 rounded-xl bg-muted/20 border border-border/50">
                <h3 className="text-lg font-bold flex items-center gap-2">Trading Revenue Share</h3>
                <p className="text-sm text-muted-foreground">
                  Fees generated from trading $VOBLE are reinvested back into the ecosystem.
                </p>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <div className="font-bold text-primary">60%</div>
                    <div className="text-[10px] text-muted-foreground leading-tight mt-1">Daily & Lucky Draw Prize Pools</div>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <div className="font-bold text-primary">40%</div>
                    <div className="text-[10px] text-muted-foreground leading-tight mt-1">Development</div>
                  </div>
                </div>
              </div>

              {/* Platform Revenue Buyback */}
              <div className="space-y-4 p-5 rounded-xl bg-muted/20 border border-border/50">
                <h3 className="text-lg font-bold flex items-center gap-2">Platform Revenue Buyback</h3>
                <p className="text-sm text-muted-foreground">
                  A portion of the revenue generated from game fees and other platform activities is used to support the
                  token price.
                </p>

                <div className="flex flex-col items-center justify-center h-24 bg-background/50 rounded-lg mt-4">
                  <div className="text-3xl font-bold text-primary">20%</div>
                  <div className="text-xs text-muted-foreground mt-1">of Platform Revenue</div>
                  <div className="text-[10px] text-muted-foreground opacity-70">Used for Token Buybacks</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  },
  {
    id: 'links',
    title: 'Links',
    content: {
      heading: 'Links',
      body: (
        <div className="space-y-6">
          <p className="text-sm text-[#707070] font-large tracking-wider">Key information and links</p>

          {/* Platform Revenue Address */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">Platform Revenue Address</h2>
            <p className="text-md">Collects all revenue generated by the platform.</p>
            <p className="font-mono text-sm text-primary bg-muted/30 p-2 rounded-lg border border-border/50 mt-4">
              TBD
            </p>
          </div>

          {/* Admin Address*/}
          <div className="space-y-4">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">Admin Address</h2>
            <p className="text-md">Withdraws platform revenue for development and buybacks.</p>
            <p className="font-mono text-sm text-primary bg-muted/30 p-2 rounded-lg border border-border/50 mt-4">
              TBD
            </p>
          </div>

          {/* Community */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">Community</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                <a
                  href="https://x.com/voblefun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </li>
              <li>
                <a
                  href="https://t.me/voblefun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
  },
]

export default function AboutPage() {
  const [activeSection, setActiveSection] = useState('intro')

  // Handle initial hash and hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash && sections.some((s) => s.id === hash)) {
        setActiveSection(hash)
      }
    }

    // Set initial section from hash if present
    handleHashChange()

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigateToSection = (id: string) => {
    setActiveSection(id)
    window.history.pushState(null, '', `#${id}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const currentSectionIndex = sections.findIndex((s) => s.id === activeSection)
  const currentSection = sections[currentSectionIndex] || sections[0]
  const prevSection = sections[currentSectionIndex - 1]
  const nextSection = sections[currentSectionIndex + 1]

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:gap-12">
          {/* Main Content */}
          <main className="flex-1 py-12 lg:py-24 min-w-0">
            <div className="max-w-3xl">
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h1 className="text-4xl font-bold mb-2 tracking-tight text-foreground">
                  {currentSection.content.heading}
                </h1>
                <div className="prose prose-neutral dark:prose-invert max-w-none mb-8">
                  <div className="text-medium text-[#DDDFE0] leading-relaxed whitespace-pre-line">
                    {currentSection.content.body}
                  </div>
                </div>

                {/* Pagination Buttons */}
                <div className="flex items-center justify-between pt-8 border-t border-border/40">
                  {prevSection ? (
                    <Button
                      variant="ghost"
                      className="group pl-0 hover:bg-transparent hover:text-primary"
                      onClick={() => navigateToSection(prevSection.id)}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                      <div className="flex flex-col items-start">
                        <span className="text-xs text-muted-foreground font-normal">Previous</span>
                        <span className="font-medium">{prevSection.title}</span>
                      </div>
                    </Button>
                  ) : (
                    <div />
                  )}

                  {nextSection ? (
                    <Button
                      variant="ghost"
                      className="group pr-0 hover:bg-transparent hover:text-primary"
                      onClick={() => navigateToSection(nextSection.id)}
                    >
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-muted-foreground font-normal">Next</span>
                        <span className="font-medium">{nextSection.title}</span>
                      </div>
                      <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  ) : (
                    <div />
                  )}
                </div>
              </section>
            </div>
          </main>

          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0 pt-24 pb-12">
            <div className="sticky top-24">
              <nav className="flex flex-col space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => navigateToSection(section.id)}
                    className={cn(
                      'text-left px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
                      activeSection === section.id
                        ? 'bg-accent text-accent-foreground translate-x-1'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                    )}
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
