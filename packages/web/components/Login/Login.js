import React from 'react';
import { Col, Row } from 'react-bootstrap';
import styled from 'styled-components';

import '../../styles/base/_variables.scss';
import LoginForm from './LoginForm';
import BottomButtonHolder from '../common/BottomButtonHolder';

const LoginContentsHolder = styled.div`
    height: 100vh;
    color: ${props => {
        return props.theme.pink;
    }};
`;

const Login = () => {
    return (
        <LoginContentsHolder>
            <Row className="d-center" style={{ height: '80%' }}>
                <Col md={4} className="pt-20">
                    <h2 className="text-center">Login</h2>
                    <LoginForm />
                    <BottomButtonHolder route="/signup" text="Don't have account?" buttonText="JOIN NOW" />
                </Col>
            </Row>
        </LoginContentsHolder>
    );
};

export default Login;
