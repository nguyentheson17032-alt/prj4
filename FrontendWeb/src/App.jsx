import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AudioProvider } from './context/AudioContext';
import { LanguageProvider } from './context/LanguageContext';
import { useAuth } from './context/AuthContext';
import { useEffect } from 'react';
import { getAuthToken } from './api/apiService';
import realtimeService from './services/realtimeService';

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
import WithdrawModal from './components/modals/WithdrawModal';
import DonateModal from './components/modals/DonateModal';
import AuthModal from './components/modals/AuthModal';

const AppContent = ({
  selectedPlayerForHire, setSelectedPlayerForHire,
  selectedPlayerForDonate, setSelectedPlayerForDonate,
  isDepositOpen, setIsDepositOpen,
  isWithdrawOpen, setIsWithdrawOpen,
  isAuthOpen, setIsAuthOpen
}) => {
  const { user, token } = useAuth();
  const location = useLocation();

  // Realtime connection lifecycle: connect when authenticated user & token are present, disconnect on logout
  useEffect(() => {
    const currentToken = token || getAuthToken();
    if (user?.id && currentToken) {
      realtimeService.connect(user.id, currentToken);
    } else {
      realtimeService.disconnect();
    }
    return () => {
      realtimeService.disconnect();
    };
  }, [user?.id, token]);
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="app-container">
      {!isAdminRoute && (
        <Navbar
          onOpenDeposit={() => setIsDepositOpen(true)}
          onOpenWithdraw={() => setIsWithdrawOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
        />
      )}

      <main className={isAdminRoute ? '' : 'main-content'}>
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                onHirePlayer={setSelectedPlayerForHire}
                onOpenDeposit={() => setIsDepositOpen(true)}
              />
            }
          />
          <Route
            path="/explore"
            element={<ExplorePage onHirePlayer={setSelectedPlayerForHire} />}
          />
          <Route
            path="/player/:id"
            element={
              <PlayerDetailPage
                onHirePlayer={setSelectedPlayerForHire}
                onDonatePlayer={setSelectedPlayerForDonate}
              />
            }
          />
          <Route
            path="/chat"
            element={<ChatPage onHirePlayer={setSelectedPlayerForHire} />}
          />
          <Route path="/moments" element={<MomentsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route
            path="/wallet"
            element={
              <WalletPage
                onOpenDeposit={() => setIsDepositOpen(true)}
                onOpenWithdraw={() => setIsWithdrawOpen(true)}
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

      {!isAdminRoute && <Footer />}

      {!isAdminRoute && (
        <>
          <BookingModal
            player={selectedPlayerForHire}
            isOpen={!!selectedPlayerForHire}
            onClose={() => setSelectedPlayerForHire(null)}
            onOpenDeposit={() => setIsDepositOpen(true)}
          />
          <DepositModal
            isOpen={isDepositOpen}
            onClose={() => setIsDepositOpen(false)}
          />
          <WithdrawModal
            isOpen={isWithdrawOpen}
            onClose={() => setIsWithdrawOpen(false)}
          />
          <DonateModal
            player={selectedPlayerForDonate}
            isOpen={!!selectedPlayerForDonate}
            onClose={() => setSelectedPlayerForDonate(null)}
            onOpenDeposit={() => setIsDepositOpen(true)}
          />
          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
          />
        </>
      )}
    </div>
  );
};

export const App = () => {
  const [selectedPlayerForHire, setSelectedPlayerForHire] = useState(null);
  const [selectedPlayerForDonate, setSelectedPlayerForDonate] = useState(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <ThemeProvider>
      <AuthProvider>
        <AudioProvider>
          <ToastProvider>
          <LanguageProvider>
            <Router>
              <AppContent
                selectedPlayerForHire={selectedPlayerForHire}
                setSelectedPlayerForHire={setSelectedPlayerForHire}
                selectedPlayerForDonate={selectedPlayerForDonate}
                setSelectedPlayerForDonate={setSelectedPlayerForDonate}
                isDepositOpen={isDepositOpen}
                setIsDepositOpen={setIsDepositOpen}
                isWithdrawOpen={isWithdrawOpen}
                setIsWithdrawOpen={setIsWithdrawOpen}
                isAuthOpen={isAuthOpen}
                setIsAuthOpen={setIsAuthOpen}
              />
            </Router>
          </LanguageProvider>
          </ToastProvider>
        </AudioProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
