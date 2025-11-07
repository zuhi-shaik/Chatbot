import React from 'react'
import { GiRobotHelmet } from "react-icons/gi";
import { HiOutlineUserCircle } from "react-icons/hi2";

const Navbar = () => {
  return (
    <div className="w-full sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-surface/60 bg-surface/80 border-b border-white/10">
      <div className="nav flex items-center justify-between h-16 sm:h-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className='Logo flex items-center gap-2 sm:gap-3'>
            <i className='text-[36px] sm:text-[42px]'><GiRobotHelmet /></i>
            <h3 className='text-[20px] sm:text-[24px] font-[700]'>Fin<span className='text-blue-500'>GPT</span></h3>
        </div>
        <div className="user">
            <button aria-label="User menu" className='text-[32px] sm:text-[36px] cursor-pointer hover:text-primary-400 transition-colors'>
              <HiOutlineUserCircle />
            </button>
        </div>
      </div>
    </div>
  )
}

export default Navbar