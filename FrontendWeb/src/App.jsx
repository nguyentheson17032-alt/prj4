import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AudioProvider } from './context/AudioContext';

import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';

// Pages
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import PlayerDetailPage from './pages/PlayerDetailPage';
import ChatPage from './pages/ChatPage';
import MomentsPage from './pages/MomentsPage';
import OrdersPage from './pages/OrdersPage';
import WalletPage from './pages/WalletPage';
import RegisterPlayerPage from './pages/RegisterPlayerPage';
import ProfilePage from './pages/ProfilePage';
import PolicyPage from './pages/PolicyPage';
import AdminPage from './pages/AdminPage';

// Modals
import BookingModal from './components/modals/BookingModal';
import DepositModal from './components/modals/DepositModal';
import DonateModal from './components/modals/DonateModal';
import AuthModal from './components/modals/AuthModal';

export const App = () => {
  const [selectedPlayerForHire, setSelectedPlayerForHire] = useState(null);
  const [selectedPlayerForDonate, setSelectedPlayerForDonate] = useState(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const handleHirePlayer = (player) => {
    setSelectedPlayerForHire(player);
  };

  const handleDonatePlayer = (player) => {
    setSelectedPlayerForDonate(player);
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        <AudioProvider>
          <ToastProvider>
            <Router>
              <div className="app-container">
                {/* Fixed Top Navbar */}
                <Navbar
                  onOpenDeposit={() => setIsDepositOpen(true)}
                  onOpenAuth={() => setIsAuthOpen(true)}
                />

                {/* Main View Router */}
                <main className="main-content">
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <HomePage
                          onHirePlayer={handleHirePlayer}
                          onOpenDeposit={() => setIsDepositOpen(true)}
                        />
                      }
                    />
                    <Route
                      path="/explore"
                      element={<ExplorePage onHirePlayer={handleHirePlayer} />}
                    />
                    <Route
                      path="/player/:id"
                      element={
                        <PlayerDetailPage
                          onHirePlayer={handleHirePlayer}
                          onDonatePlayer={handleDonatePlayer}
                        />
                      }
                    />
                    <Route
                      path="/chat"
                      element={<ChatPage onHirePlayer={handleHirePlayer} />}
                    />
                    <Route path="/moments" element={<MomentsPage />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route
                      path="/wallet"
                      element={
                        <WalletPage
                          onOpenDeposit={() => setIsDepositOpen(true)}
                        />
                      }
                    />
                    <Route
                      path="/register-player"
                      element={<RegisterPlayerPage onOpenAuth={() => setIsAuthOpen(true)} />}
                    />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/policy" element={<PolicyPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/admin/*" element={<AdminPage />} />
                  </Routes>
                </main>

                {/* Footer */}
                <Footer />

                {/* Global Modals */}
                <BookingModal
                  player={selectedPlayerForHire}
                  isOpen={!!selectedPlayerForHire}
                  onClose={() => setSelectedPlayerForHire(null)}
                  onOpenDeposit={() => {
                    setSelectedPlayerForHire(null);
                    setIsDepositOpen(true);
                  }}
                />

                <DepositModal
                  isOpen={isDepositOpen}
                  onClose={() => setIsDepositOpen(false)}
                />

                <DonateModal
                  player={selectedPlayerForDonate}
                  isOpen={!!selectedPlayerForDonate}
                  onClose={() => setSelectedPlayerForDonate(null)}
                  onOpenDeposit={() => {
                    setSelectedPlayerForDonate(null);
                    setIsDepositOpen(true);
                  }}
                />

                <AuthModal
                  isOpen={isAuthOpen}
                  onClose={() => setIsAuthOpen(false)}
                />
              </div>
            </Router>
          </ToastProvider>
        </AudioProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
